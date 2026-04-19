import type { PrismaClient } from "@prisma/client";
import { buildComplianceEventData } from "@/lib/compliance-event-factory";
import { evaluateMissingDocuments } from "@/lib/required-documents";
import { logger } from "@/lib/logger";

function isoWeekId(d: Date): string {
  const t = new Date(
    Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())
  );
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const year = t.getUTCFullYear();
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const week = Math.ceil(
    ((t.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
  );
  return `${year}-W${String(week).padStart(2, "0")}`;
}

/**
 * Creates WORKER_MISSING_DOCUMENTS notifications weekly per missing doc type (idempotent).
 */
export async function processMissingDocumentNotifications(
  prisma: PrismaClient,
  now: Date = new Date()
): Promise<{ created: number }> {
  const workers = await prisma.worker.findMany({
    where: { employmentStatus: { not: "TERMINATED" } },
    include: {
      documents: { where: { isDeleted: false } },
    },
  });

  const week = isoWeekId(now);
  let created = 0;

  for (const w of workers) {
    const missing = evaluateMissingDocuments(w, w.documents, now).filter(
      (m) => m.reason === "missing" || m.reason === "expired"
    );
    for (const m of missing) {
      const key = `${w.id}-MISSING_DOC-${m.documentType}-${week}`;
      try {
        const payload = buildComplianceEventData({
          workerId: w.id,
          tenantId: w.tenantId,
          eventType: "WORKER_MISSING_DOCUMENTS",
          idempotencyKey: key,
          dueDate: now,
          reportDeadlineAt: now,
          occurredAt: now,
          workerName: `${w.firstName} ${w.lastName}`,
          cosReference: w.cosReference,
          metadata: {
            documentType: m.documentType,
            urgency: m.urgency,
            reason: m.reason,
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
        created += 1;
      } catch (e) {
        logger.error("missing doc notification upsert failed", e, {
          workerId: w.id,
        });
      }
    }
  }

  return { created };
}
