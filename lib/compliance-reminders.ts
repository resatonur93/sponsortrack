import type { PrismaClient } from "@prisma/client";
import { logger } from "@/lib/logger";
import { getEscalationLevel } from "@/lib/escalation";

// Visa / RTW / sponsorship reminder e-postaları günlük `runDailyCron` içinde
// (`processVisaAndSponsorshipExpiries`) işlenir; bu modül escalation (LEVEL_3 konsol) için.

type Meta = { level3EmailPrepared?: boolean };

/**
 * LEVEL_3 kritik: bir kez console (e-posta entegrasyonu için hazırlık).
 */
export async function processEscalationNotifications(
  prisma: PrismaClient,
  now: Date = new Date()
): Promise<{ level3Logged: number }> {
  const pending = await prisma.notificationEvent.findMany({
    where: { status: { in: ["PENDING", "OVERDUE"] } },
    select: {
      id: true,
      dueDate: true,
      reportDeadlineAt: true,
      status: true,
      metadata: true,
      eventType: true,
      workerId: true,
    },
  });

  let level3Logged = 0;

  for (const row of pending) {
    const deadline = row.reportDeadlineAt ?? row.dueDate;
    const level = getEscalationLevel(deadline, now, row.status);
    if (level !== 3) continue;

    const meta = (row.metadata ?? {}) as Meta;
    if (meta.level3EmailPrepared) continue;

    logger.info("[LEVEL_3 email prep — console]", {
      notificationId: row.id,
      workerId: row.workerId,
      eventType: row.eventType,
      deadline: deadline.toISOString(),
    });

    await prisma.notificationEvent.update({
      where: { id: row.id },
      data: {
        metadata: {
          ...(row.metadata as object),
          level3EmailPrepared: true,
          level3PreparedAt: now.toISOString(),
        } as object,
      },
    });
    level3Logged += 1;
  }

  return { level3Logged };
}
