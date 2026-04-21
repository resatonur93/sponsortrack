import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { longestUnauthorisedWorkingDayStreak } from "@/lib/absence-streak";
import { buildComplianceEventData } from "@/lib/compliance-event-factory";
import { getReportDeadlineForEvent } from "@/lib/deadline-rules";

function isoWeekKey(d: Date): string {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y = t.getUTCFullYear();
  const z = new Date(Date.UTC(y, 0, 1));
  const w = Math.ceil(
    ((t.getTime() - z.getTime()) / 86400000 + 1) / 7
  );
  return `${y}-W${String(w).padStart(2, "0")}`;
}

/** After absence create/update: 10+ consecutive UK working days unauthorised → notification (idempotent per week). */
export async function triggerUnauthorisedAbsence10DayIfNeeded(input: {
  workerId: string;
  tenantId: string;
}): Promise<void> {
  const worker = await prisma.worker.findFirst({
    where: { id: input.workerId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      cosReference: true,
    },
  });
  if (!worker) return;

  const allAbs = await prisma.absenceRecord.findMany({
    where: { workerId: input.workerId },
  });
  const streak = longestUnauthorisedWorkingDayStreak(allAbs);
  if (streak < 10) return;

  const week = isoWeekKey(new Date());
  const key = `${input.workerId}-UNAUTH-10WD-${week}`;
  const occurred = new Date();
  const deadline = getReportDeadlineForEvent("UNAUTHORISED_ABSENCE", occurred);

  try {
    const payload = buildComplianceEventData({
      workerId: input.workerId,
      tenantId: input.tenantId,
      eventType: "UNAUTHORISED_ABSENCE",
      idempotencyKey: key,
      dueDate: deadline,
      reportDeadlineAt: deadline,
      occurredAt: occurred,
      workerName: `${worker.firstName} ${worker.lastName}`,
      cosReference: worker.cosReference,
      metadata: {
        consecutiveWorkingDays: streak,
        trigger: "10_uk_working_days",
      },
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
    logger.error("unauthorised absence 10d notification failed", e);
  }
}
