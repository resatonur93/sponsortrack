import { NextRequest, NextResponse } from "next/server";
import type { Prisma, SalaryRecord } from "@prisma/client";
import { getSessionUser, withTenant } from "@/lib/api-context";
import { prisma } from "@/lib/prisma";
import { salaryRecordCreateSchema, salaryDeductionItemSchema } from "@/lib/schemas";
import type { z } from "zod";
import { logger } from "@/lib/logger";
import {
  evaluateSalaryCompliance,
  computeExpectedForPeriod,
  computeExpectedForPeriodWithLeave,
  parseSalaryCsvDate,
  checkBelowCosThreshold,
  checkHoursDiscrepancy,
  checkBelowApplicableThreshold,
} from "@/lib/salary-record-utils";
import { unpaidLeaveDaysInPeriod } from "@/lib/absence-record-compute";

type SalaryDeductionItem = z.infer<typeof salaryDeductionItemSchema>;

export const dynamic = "force-dynamic";

type RouteParams = { params: { id: string } };

function enrichRecord(r: SalaryRecord): SalaryRecord & { expectedForPeriod: number } {
  return {
    ...r,
    expectedForPeriod: computeExpectedForPeriod(
      r.contractedSalary,
      r.periodStart,
      r.periodEnd
    ),
  };
}

async function createRecord(
  workerId: string,
  tenantId: string,
  userId: string,
  worker: {
    salary: number;
    contractedHoursPerWeek: number | null;
    applicableSalaryThreshold: number | null;
  },
  raw: {
    periodStart: string;
    periodEnd: string;
    contractedSalary?: number;
    actualPaid: number;
    currency?: string;
    hoursWorked?: number | null;
    overtime?: number | null;
    deductions?: SalaryDeductionItem[] | null;
    evidenceUrl?: string | null;
    approvedBy?: string | null;
  }
): Promise<SalaryRecord> {
  const periodStart = new Date(raw.periodStart);
  const periodEnd = new Date(raw.periodEnd);
  if (periodEnd.getTime() < periodStart.getTime()) {
    throw new Error("periodEnd must be on or after periodStart");
  }

  // CoS'ta taahhüt edilen maaş, çalışan profilinden gelir — kullanıcı her kayıtta yeniden girmez.
  const contractedSalary = raw.contractedSalary ?? worker.salary;

  const { isCompliant, discrepancyReason } = evaluateSalaryCompliance(
    contractedSalary,
    raw.actualPaid,
    periodStart,
    periodEnd
  );
  const belowCosThreshold = checkBelowCosThreshold(contractedSalary, worker.salary);
  const hoursDiscrepancy = checkHoursDiscrepancy(
    raw.hoursWorked,
    worker.contractedHoursPerWeek,
    periodStart,
    periodEnd
  );
  const belowApplicableThreshold = checkBelowApplicableThreshold(
    contractedSalary,
    worker.applicableSalaryThreshold
  );

  return prisma.salaryRecord.create({
    data: {
      workerId,
      tenantId,
      periodStart,
      periodEnd,
      contractedSalary,
      actualPaid: raw.actualPaid,
      currency: raw.currency ?? "GBP",
      hoursWorked: raw.hoursWorked ?? undefined,
      overtime: raw.overtime ?? undefined,
      deductions:
        raw.deductions != null
          ? (raw.deductions as unknown as Prisma.InputJsonValue)
          : undefined,
      isCompliant,
      discrepancyReason,
      belowCosThreshold,
      hoursDiscrepancy,
      belowApplicableThreshold,
      evidenceUrl: raw.evidenceUrl ?? undefined,
      approvedBy: raw.approvedBy ?? userId,
    },
  });
}

function parseSalaryCsvForWorker(
  csv: string,
  workerId: string,
  tenantId: string,
  userId: string,
  worker: {
    salary: number;
    contractedHoursPerWeek: number | null;
    applicableSalaryThreshold: number | null;
  }
): Promise<SalaryRecord[]> {
  const lines = csv
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) {
    return Promise.resolve([]);
  }

  let startIdx = 0;
  if (/periodstart/i.test(lines[0] ?? "")) {
    startIdx = 1;
  }

  const created: Promise<SalaryRecord>[] = [];

  for (let i = startIdx; i < lines.length; i += 1) {
    const parts = lines[i].split(",").map((p) => p.trim());
    if (parts.length < 4) continue;

    const [
      pStartRaw,
      pEndRaw,
      contractedRaw,
      actualRaw,
      currencyRaw,
      hoursRaw,
      overtimeRaw,
      evidenceRaw,
    ] = parts;

    const periodStart = parseSalaryCsvDate(pStartRaw);
    const periodEnd = parseSalaryCsvDate(pEndRaw);
    if (!periodStart || !periodEnd) continue;

    const contractedSalary = parseInt(contractedRaw.replace(/\D/g, ""), 10);
    const actualPaid = parseInt(actualRaw.replace(/\D/g, ""), 10);
    if (Number.isNaN(contractedSalary) || Number.isNaN(actualPaid)) continue;

    const currency = currencyRaw && currencyRaw.length > 0 ? currencyRaw : "GBP";
    let hoursWorked: number | null | undefined;
    if (hoursRaw && hoursRaw.length > 0) {
      const h = parseInt(hoursRaw.replace(/\D/g, ""), 10);
      hoursWorked = Number.isNaN(h) ? null : h;
    }
    let overtime: number | null | undefined;
    if (overtimeRaw && overtimeRaw.length > 0) {
      const o = parseInt(overtimeRaw.replace(/\D/g, ""), 10);
      overtime = Number.isNaN(o) ? null : o;
    }
    const evidenceUrl = evidenceRaw && evidenceRaw.length > 0 ? evidenceRaw : null;

    created.push(
      createRecord(workerId, tenantId, userId, worker, {
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
        contractedSalary,
        actualPaid,
        currency,
        hoursWorked,
        overtime,
        evidenceUrl,
      })
    );
  }

  return Promise.all(created);
}

export async function GET(
  req: NextRequest,
  context: RouteParams
): Promise<NextResponse> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const workerId = context.params.id;
    const months = Math.min(
      60,
      Math.max(1, parseInt(req.nextUrl.searchParams.get("months") ?? "12", 10) || 12)
    );
    const from = new Date();
    from.setMonth(from.getMonth() - months);

    return await withTenant(user, req, async () => {
      const worker = await prisma.worker.findFirst({
        where: { id: workerId },
        select: {
          id: true,
          salary: true,
          contractedHoursPerWeek: true,
          applicableSalaryThreshold: true,
        },
      });
      if (!worker) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      const [rows, unpaidLeaves] = await Promise.all([
        prisma.salaryRecord.findMany({
          where: { workerId, periodEnd: { gte: from } },
          orderBy: { periodEnd: "asc" },
        }),
        prisma.absenceRecord.findMany({
          where: { workerId, type: "UNPAID_LEAVE" },
          select: { type: true, startDate: true, endDate: true },
        }),
      ]);

      return NextResponse.json({
        data: {
          records: rows.map((r) => {
            const unpaidDays = unpaidLeaveDaysInPeriod(
              { start: r.periodStart, end: r.periodEnd },
              unpaidLeaves
            );
            const expectedForPeriodAdjustedForLeave =
              unpaidDays > 0
                ? computeExpectedForPeriodWithLeave(
                    r.contractedSalary,
                    r.periodStart,
                    r.periodEnd,
                    unpaidDays
                  )
                : null;
            return {
              ...enrichRecord(r),
              overlapsUnpaidLeave: unpaidDays > 0,
              expectedForPeriodAdjustedForLeave,
              underpaidBeyondLeave:
                expectedForPeriodAdjustedForLeave !== null &&
                r.actualPaid < expectedForPeriodAdjustedForLeave,
            };
          }),
          cosAnnualSalaryGbp: worker.salary,
          contractedHoursPerWeek: worker.contractedHoursPerWeek,
          applicableSalaryThreshold: worker.applicableSalaryThreshold,
        },
      });
    });
  } catch (error) {
    logger.error("GET /api/workers/[id]/salary-records failed", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  context: RouteParams
): Promise<NextResponse> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const workerId = context.params.id;
    const body: unknown = await req.json();

    return await withTenant(user, req, async () => {
      const worker = await prisma.worker.findFirst({
        where: { id: workerId },
        select: {
          id: true,
          salary: true,
          contractedHoursPerWeek: true,
          applicableSalaryThreshold: true,
        },
      });
      if (!worker) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      if (
        typeof body === "object" &&
        body !== null &&
        "csv" in body &&
        typeof (body as { csv: unknown }).csv === "string"
      ) {
        const csv = (body as { csv: string }).csv;
        if (!csv.trim()) {
          return NextResponse.json(
            { error: "csv string required" },
            { status: 400 }
          );
        }
        try {
          const records = await parseSalaryCsvForWorker(
            csv,
            workerId,
            user.tenantId,
            user.id,
            worker
          );
          return NextResponse.json(
            {
              data: {
                created: records.length,
                records: records.map(enrichRecord),
              },
            },
            { status: 201 }
          );
        } catch (e) {
          const msg = e instanceof Error ? e.message : "CSV parse failed";
          return NextResponse.json({ error: msg }, { status: 400 });
        }
      }

      const parsed = salaryRecordCreateSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Validation failed", details: parsed.error.flatten() },
          { status: 400 }
        );
      }
      const d = parsed.data;

      try {
        const row = await createRecord(workerId, user.tenantId, user.id, worker, {
          periodStart: d.periodStart,
          periodEnd: d.periodEnd,
          contractedSalary: d.contractedSalary,
          actualPaid: d.actualPaid,
          currency: d.currency,
          hoursWorked: d.hoursWorked,
          overtime: d.overtime,
          deductions: d.deductions ?? null,
          evidenceUrl: d.evidenceUrl,
          approvedBy: d.approvedBy,
        });
        return NextResponse.json(
          { data: enrichRecord(row) },
          { status: 201 }
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Create failed";
        return NextResponse.json({ error: msg }, { status: 400 });
      }
    });
  } catch (error) {
    logger.error("POST /api/workers/[id]/salary-records failed", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
