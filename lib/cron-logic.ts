import { prismaBase } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { visaNotificationsToCreate } from "@/lib/notification-rules";
import { startOfDay } from "@/lib/dates";
import { getEvidenceHint, getSmsDraft } from "@/lib/compliance-templates";
import { processEscalationNotifications } from "@/lib/compliance-reminders";
import { processMissingDocumentNotifications } from "@/lib/missing-documents-cron";
import { processExpiredDocumentEmails } from "@/lib/document-expiry-email-notify";

/**
 * Runs daily maintenance: overdue notifications, visa/document upserts, kademeli hatırlatmalar.
 */
export async function runDailyCron(): Promise<{
  overdueUpdated: number;
  visaEventsCreated: number;
  documentEventsCreated: number;
  escalationLevel3: number;
  missingDocEvents: number;
  documentExpiryEmailsSent: number;
  documentExpiryEmailSkippedNoSmtp: boolean;
}> {
  const now = new Date();
  let overdueUpdated = 0;
  let visaEventsCreated = 0;
  let documentEventsCreated = 0;

  const pendingOverdue = await prismaBase.notificationEvent.updateMany({
    where: {
      status: "PENDING",
      OR: [
        { reportDeadlineAt: { not: null, lt: now } },
        {
          AND: [{ reportDeadlineAt: null }, { dueDate: { lt: now } }],
        },
      ],
    },
    data: { status: "OVERDUE" },
  });
  overdueUpdated = pendingOverdue.count;

  const workers = await prismaBase.worker.findMany({
    where: {
      employmentStatus: { not: "TERMINATED" },
      visaExpiryDate: { not: null },
    },
    select: {
      id: true,
      tenantId: true,
      visaExpiryDate: true,
      firstName: true,
      lastName: true,
      cosReference: true,
    },
  });

  for (const w of workers) {
    if (!w.visaExpiryDate) continue;
    const rows = visaNotificationsToCreate(
      w.id,
      w.tenantId,
      w.visaExpiryDate,
      {
        firstName: w.firstName,
        lastName: w.lastName,
        cosReference: w.cosReference,
      }
    );
    for (const row of rows) {
      try {
        await prismaBase.notificationEvent.upsert({
          where: { idempotencyKey: row.idempotencyKey as string },
          create: row,
          update: {},
        });
        visaEventsCreated += 1;
      } catch (e) {
        logger.error("visa notification upsert failed", e, { workerId: w.id });
      }
    }
  }

  const docs = await prismaBase.document.findMany({
    where: {
      isDeleted: false,
      expiryDate: { not: null },
    },
    select: {
      id: true,
      workerId: true,
      tenantId: true,
      expiryDate: true,
    },
  });

  const in30 = new Date(now);
  in30.setDate(in30.getDate() + 30);

  for (const d of docs) {
    if (!d.expiryDate) continue;
    if (d.expiryDate > in30 || d.expiryDate < now) continue;
    const dayStr = startOfDay(d.expiryDate).toISOString().slice(0, 10);
    const key = `doc:${d.workerId}:${d.id}:DOCUMENT_EXPIRING:${dayStr}`;
    try {
      const worker = await prismaBase.worker.findUnique({
        where: { id: d.workerId },
        select: { firstName: true, lastName: true, cosReference: true },
      });
      const workerName = worker
        ? `${worker.firstName} ${worker.lastName}`
        : "Worker";
      const cosRef = worker?.cosReference ?? "";
      const occurredAt = new Date();
      await prismaBase.notificationEvent.upsert({
        where: { idempotencyKey: key },
        create: {
          workerId: d.workerId,
          tenantId: d.tenantId,
          eventType: "DOCUMENT_EXPIRING",
          idempotencyKey: key,
          dueDate: startOfDay(d.expiryDate),
          reportDeadlineAt: startOfDay(d.expiryDate),
          occurredAt,
          status: "PENDING",
          metadata: { documentId: d.id },
          smsDraft: getSmsDraft("DOCUMENT_EXPIRING", {
            workerName,
            cosRef,
          }),
          evidenceRequired: getEvidenceHint("DOCUMENT_EXPIRING"),
        },
        update: {},
      });
      documentEventsCreated += 1;
    } catch (e) {
      logger.error("document notification upsert failed", e, { documentId: d.id });
    }
  }

  const { level3Logged } = await processEscalationNotifications(prismaBase, now);
  const { created: missingDocEvents } =
    await processMissingDocumentNotifications(prismaBase, now);

  const { sent: documentExpiryEmailsSent, skippedNoSmtp: documentExpiryEmailSkippedNoSmtp } =
    await processExpiredDocumentEmails(prismaBase, now);

  return {
    overdueUpdated,
    visaEventsCreated,
    documentEventsCreated,
    escalationLevel3: level3Logged,
    missingDocEvents,
    documentExpiryEmailsSent,
    documentExpiryEmailSkippedNoSmtp,
  };
}
