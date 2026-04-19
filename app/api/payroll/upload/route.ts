import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, withTenant } from "@/lib/api-context";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { buildComplianceEventData } from "@/lib/compliance-event-factory";

export const dynamic = "force-dynamic";

/** CSV rows: email,expectedAnnual,actualAnnual (pence or whole GBP — compared as integers) */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: unknown = await req.json();
    const csv =
      typeof body === "object" &&
      body !== null &&
      "csv" in body &&
      typeof (body as { csv: unknown }).csv === "string"
        ? (body as { csv: string }).csv
        : null;
    if (!csv?.trim()) {
      return NextResponse.json(
        { error: "json body { csv: string } required" },
        { status: 400 }
      );
    }

    return await withTenant(user, req, async () => {
      const lines = csv
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
      const discrepancies: {
        workerId: string;
        expected: number;
        actual: number;
      }[] = [];

      for (const line of lines) {
        if (/^email/i.test(line)) continue;
        const parts = line.split(",").map((p) => p.trim());
        if (parts.length < 3) continue;
        const [email, expStr, actStr] = parts;
        const expected = parseInt(expStr.replace(/\D/g, ""), 10);
        const actual = parseInt(actStr.replace(/\D/g, ""), 10);
        if (!email || Number.isNaN(expected) || Number.isNaN(actual)) continue;

        const worker = await prisma.worker.findFirst({
          where: { email: { equals: email, mode: "insensitive" } },
        });
        if (!worker) continue;
        if (expected === actual) continue;

        const key = `payroll-disc:${worker.id}:${expected}:${actual}:${toDateOnly(new Date())}`;
        try {
          const payload = buildComplianceEventData({
            workerId: worker.id,
            tenantId: user.tenantId,
            eventType: "SALARY_DISCREPANCY",
            idempotencyKey: key,
            dueDate: new Date(),
            reportDeadlineAt: new Date(),
            occurredAt: new Date(),
            workerName: `${worker.firstName} ${worker.lastName}`,
            cosReference: worker.cosReference,
            metadata: { expected, actual, source: "payroll_csv" },
          });
          await prisma.notificationEvent.upsert({
            where: { idempotencyKey: key },
            create: {
              ...payload,
              metadata: payload.metadata as object,
            },
            update: {},
          });
        } catch (e) {
          logger.error("payroll discrepancy upsert failed", e);
        }
        discrepancies.push({ workerId: worker.id, expected, actual });
      }

      return NextResponse.json({
        data: { discrepanciesFound: discrepancies.length, discrepancies },
      });
    });
  } catch (error) {
    logger.error("POST payroll upload failed", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

function toDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}
