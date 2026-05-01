import { prismaBase } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  dateWindowNotificationsToCreate,
  RTW_RECHECK_WINDOWS,
  SPONSORSHIP_END_WINDOWS,
  visaNotificationsToCreate,
} from "@/lib/notification-rules";
import { startOfDay } from "@/lib/dates";
import { getEvidenceHint, getSmsDraft } from "@/lib/compliance-templates";
import { processEscalationNotifications } from "@/lib/compliance-reminders";
import { processMissingDocumentNotifications } from "./missing-documents-cron";
import { processExpiredDocumentEmails } from "@/lib/notifications/email/document-expiry-email-notify";
import { closeStaleDocumentExpiringNotifications } from "@/lib/documents/document-expiring-notification-closure";
import { processVisaAndSponsorshipExpiries } from "@/lib/notifications/email/notification-expiry-email";

/**
 * Runs daily maintenance: overdue notifications, visa/document upserts, kademeli hatırlatmalar.
 */
export async function runDailyCron(): Promise<{
  overdueUpdated: number;
  visaEventsCreated: number;
  rtwRecheckEventsCreated: number;
  sponsorshipEndingEventsCreated: number;
  documentEventsCreated: number;
  escalationLevel3: number;
  missingDocEvents: number;
  documentExpiryEmailsSent: number;
  documentExpiryEmailSkippedNoSmtp: boolean;
  notificationExpiryEmailsSent: number;
  notificationExpiryEmailSkippedNoSmtp: boolean;
  documentExpiringNotificationsClosed: number;
}> {
  const now = new Date();
  let overdueUpdated = 0;
  let visaEventsCreated = 0;
  let rtwRecheckEventsCreated = 0;
  let sponsorshipEndingEventsCreated = 0;
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

  const rtwWorkers = await prismaBase.worker.findMany({
    where: {
      employmentStatus: { not: "TERMINATED" },
      rtwChecks: { some: { nextCheckDueAt: { not: null } } },
    },
    select: {
      id: true,
      tenantId: true,
      firstName: true,
      lastName: true,
      cosReference: true,
      rtwChecks: {
        where: { nextCheckDueAt: { not: null } },
        orderBy: { nextCheckDueAt: "asc" },
        take: 1,
        select: { id: true, nextCheckDueAt: true },
      },
    },
  });
  for (const w of rtwWorkers) {
    const nextDue = w.rtwChecks[0]?.nextCheckDueAt;
    if (!nextDue) continue;
    const rows = dateWindowNotificationsToCreate({
      workerId: w.id,
      tenantId: w.tenantId,
      targetDate: nextDue,
      windows: RTW_RECHECK_WINDOWS,
      idKey: `rtw:${w.rtwChecks[0].id}`,
      metadataKey: "rtwNextCheckDueAt",
      workerLabel: {
        firstName: w.firstName,
        lastName: w.lastName,
        cosReference: w.cosReference,
      },
    });
    for (const row of rows) {
      try {
        await prismaBase.notificationEvent.upsert({
          where: { idempotencyKey: row.idempotencyKey as string },
          create: row,
          update: {},
        });
        rtwRecheckEventsCreated += 1;
      } catch (e) {
        logger.error("rtw recheck notification upsert failed", e, { workerId: w.id });
      }
    }
  }

  const sponsorshipWorkers = await prismaBase.worker.findMany({
    where: {
      employmentStatus: { not: "TERMINATED" },
      sponsorshipEndDate: { not: null },
    },
    select: {
      id: true,
      tenantId: true,
      sponsorshipEndDate: true,
      firstName: true,
      lastName: true,
      cosReference: true,
    },
  });
  for (const w of sponsorshipWorkers) {
    if (!w.sponsorshipEndDate) continue;
    const rows = dateWindowNotificationsToCreate({
      workerId: w.id,
      tenantId: w.tenantId,
      targetDate: w.sponsorshipEndDate,
      windows: SPONSORSHIP_END_WINDOWS,
      idKey: "sponsorship-end",
      metadataKey: "sponsorshipEndDate",
      workerLabel: {
        firstName: w.firstName,
        lastName: w.lastName,
        cosReference: w.cosReference,
      },
    });
    for (const row of rows) {
      try {
        await prismaBase.notificationEvent.upsert({
          where: { idempotencyKey: row.idempotencyKey as string },
          create: row,
          update: {},
        });
        sponsorshipEndingEventsCreated += 1;
      } catch (e) {
        logger.error("sponsorship ending notification upsert failed", e, {
          workerId: w.id,
        });
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

  const {
    sent: notificationExpiryEmailsSent,
    skippedNoSmtp: notificationExpiryEmailSkippedNoSmtp,
  } = await processVisaAndSponsorshipExpiries(prismaBase, now);

  const documentExpiringNotificationsClosed =
    await closeStaleDocumentExpiringNotifications(prismaBase, { now });

  return {
    overdueUpdated,
    visaEventsCreated,
    rtwRecheckEventsCreated,
    sponsorshipEndingEventsCreated,
    documentEventsCreated,
    escalationLevel3: level3Logged,
    missingDocEvents,
    documentExpiryEmailsSent,
    documentExpiryEmailSkippedNoSmtp,
    notificationExpiryEmailsSent,
    notificationExpiryEmailSkippedNoSmtp,
    documentExpiringNotificationsClosed,
  };
}
