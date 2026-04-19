import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, withTenant } from "@/lib/api-context";
import { prisma } from "@/lib/prisma";
import { absenceCreateSchema } from "@/lib/schemas";
import { logger } from "@/lib/logger";
import { AbsenceType } from "@prisma/client";
import { longestUnauthorisedWorkingDayStreak } from "@/lib/absence-streak";
import { buildComplianceEventData } from "@/lib/compliance-event-factory";
import { getReportDeadlineForEvent } from "@/lib/deadline-rules";

export const dynamic = "force-dynamic";

type RouteParams = { params: { id: string } };

export async function GET(
  req: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return await withTenant(user, req, async () => {
      const rows = await prisma.absenceRecord.findMany({
        where: { workerId: params.id },
        orderBy: { startDate: "desc" },
      });
      return NextResponse.json({ data: rows });
    });
  } catch (error) {
    logger.error("GET absences failed", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body: unknown = await req.json();
    const parsed = absenceCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const d = parsed.data;

    return await withTenant(user, req, async () => {
      const worker = await prisma.worker.findUnique({
        where: { id: params.id },
      });
      if (!worker) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      const absenceType: AbsenceType =
        d.absenceType ??
        (d.isAuthorised ? "AUTHORISED" : "UNAUTHORISED");
      const isAuthorised =
        absenceType === "AUTHORISED" || absenceType === "SICK";

      const row = await prisma.absenceRecord.create({
        data: {
          workerId: params.id,
          tenantId: user.tenantId,
          startDate: new Date(d.startDate),
          endDate: d.endDate ? new Date(d.endDate) : undefined,
          absenceType,
          isAuthorised,
          consecutiveWorkingDays: d.consecutiveWorkingDays ?? undefined,
          notes: d.notes ?? undefined,
          contactAttemptsLog: d.contactAttemptsLog ?? undefined,
          approvedBy: d.approvedBy ?? undefined,
          createdByUserId: user.id,
        },
      });

      const allAbs = await prisma.absenceRecord.findMany({
        where: { workerId: params.id },
      });
      const streak = longestUnauthorisedWorkingDayStreak(allAbs);
      if (streak >= 10) {
        const week = isoWeekKey(new Date());
        const key = `${params.id}-UNAUTH-10WD-${week}`;
        const occurred = new Date();
        const deadline = getReportDeadlineForEvent(
          "UNAUTHORISED_ABSENCE",
          occurred
        );
        try {
          const payload = buildComplianceEventData({
            workerId: params.id,
            tenantId: user.tenantId,
            eventType: "UNAUTHORISED_ABSENCE",
            idempotencyKey: key,
            dueDate: deadline,
            reportDeadlineAt: deadline,
            occurredAt: occurred,
            workerName: `${worker.firstName} ${worker.lastName}`,
            cosReference: worker.cosReference,
            metadata: { consecutiveWorkingDays: streak },
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
          logger.error("unauth absence streak notification failed", e);
        }
      }

      return NextResponse.json({ data: row }, { status: 201 });
    });
  } catch (error) {
    logger.error("POST absences failed", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

function isoWeekKey(d: Date): string {
  const t = new Date(
    Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())
  );
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y = t.getUTCFullYear();
  const z = new Date(Date.UTC(y, 0, 1));
  const w = Math.ceil(
    ((t.getTime() - z.getTime()) / 86400000 + 1) / 7
  );
  return `${y}-W${String(w).padStart(2, "0")}`;
}
