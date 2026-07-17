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
import { processVisaAndSponsorshipExpiries } from "@/lib/scheduler/processVisaAndSponsorshipExpiries";
import {
  WINDOW_COMPLIANCE_NOTIFICATION_TYPES,
  pruneStalePendingRtwRecheckEvents,
  pruneStalePendingSponsorshipEndingEvents,
  pruneStalePendingVisaEvents,
} from "@/lib/scheduler/prune-stale-notification-events";
import { forEachInBatches } from "@/lib/scheduler/batch-iterate";

const BATCH = 100;

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
  logger.info("runDailyCron: start", { now: now.toISOString() });

  // ── 1. Overdue notification toplu güncelleme ──────────────────────────────
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
  const overdueUpdated = pendingOverdue.count;

  const terminatedWindowPurge = await prismaBase.notificationEvent.deleteMany({
    where: {
      status: { in: ["PENDING", "OVERDUE"] },
      worker: { employmentStatus: "TERMINATED" },
      eventType: { in: WINDOW_COMPLIANCE_NOTIFICATION_TYPES },
    },
  });
  if (terminatedWindowPurge.count > 0) {
    logger.info("runDailyCron: purged pending window notifications for terminated workers", {
      deleted: terminatedWindowPurge.count,
    });
  }

  // ── 2. Vize bildirimleri — batch ─────────────────────────────────────────
  const visaEventsCreated = await forEachInBatches(
    (cursor, take) =>
      prismaBase.worker.findMany({
        where: {
          employmentStatus: { not: "TERMINATED" },
          visaExpiryDate: { not: null },
          ...(cursor ? { id: { gt: cursor } } : {}),
        },
        orderBy: { id: "asc" },
        take,
        select: {
          id: true,
          tenantId: true,
          visaExpiryDate: true,
          firstName: true,
          lastName: true,
          cosReference: true,
        },
      }),
    async (w) => {
      if (!w.visaExpiryDate) return 0;
      const rows = visaNotificationsToCreate(w.id, w.tenantId, w.visaExpiryDate, {
        firstName: w.firstName,
        lastName: w.lastName,
        cosReference: w.cosReference,
      });
      let created = 0;
      for (const row of rows) {
        try {
          await prismaBase.notificationEvent.upsert({
            where: { idempotencyKey: row.idempotencyKey as string },
            create: row,
            update: {},
          });
          created += 1;
        } catch (e) {
          logger.error("visa notification upsert failed", e, { workerId: w.id });
        }
      }
      try {
        await pruneStalePendingVisaEvents(prismaBase, w);
      } catch (e) {
        logger.error("visa notification stale prune failed", e, { workerId: w.id });
      }
      return created;
    },
    BATCH
  );

  // Vize tarihi temizlenmiş worker'lar için stale prune
  await forEachInBatches(
    (cursor, take) =>
      prismaBase.worker.findMany({
        where: {
          employmentStatus: { not: "TERMINATED" },
          visaExpiryDate: null,
          ...(cursor ? { id: { gt: cursor } } : {}),
        },
        orderBy: { id: "asc" },
        take,
        select: { id: true, tenantId: true },
      }),
    async (w) => {
      try {
        await pruneStalePendingVisaEvents(prismaBase, { ...w, visaExpiryDate: null });
      } catch (e) {
        logger.error("visa stale prune (no expiry) failed", e, { workerId: w.id });
      }
      return 0;
    },
    BATCH
  );

  // ── 3. RTW recheck bildirimleri — batch ──────────────────────────────────
  const rtwRecheckEventsCreated = await forEachInBatches(
    (cursor, take) =>
      prismaBase.worker.findMany({
        where: {
          employmentStatus: { not: "TERMINATED" },
          rtwChecks: { some: { nextCheckDueAt: { not: null } } },
          ...(cursor ? { id: { gt: cursor } } : {}),
        },
        orderBy: { id: "asc" },
        take,
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
      }),
    async (w) => {
      const check = w.rtwChecks[0];
      const nextDue = check?.nextCheckDueAt;
      let created = 0;
      if (nextDue && check) {
        const rows = dateWindowNotificationsToCreate({
          workerId: w.id,
          tenantId: w.tenantId,
          targetDate: nextDue,
          windows: RTW_RECHECK_WINDOWS,
          idKey: `rtw:${check.id}`,
          metadataKey: "rtwNextCheckDueAt",
          workerLabel: { firstName: w.firstName, lastName: w.lastName, cosReference: w.cosReference },
        });
        for (const row of rows) {
          try {
            await prismaBase.notificationEvent.upsert({
              where: { idempotencyKey: row.idempotencyKey as string },
              create: row,
              update: {},
            });
            created += 1;
          } catch (e) {
            logger.error("rtw recheck notification upsert failed", e, { workerId: w.id });
          }
        }
      }
      try {
        await pruneStalePendingRtwRecheckEvents(prismaBase, {
          id: w.id,
          tenantId: w.tenantId,
          rtwNext: check && nextDue ? { id: check.id, nextCheckDueAt: nextDue } : null,
        });
      } catch (e) {
        logger.error("rtw stale prune failed", e, { workerId: w.id });
      }
      return created;
    },
    BATCH
  );

  // RTW tarihi olmayan worker'lar için stale prune
  await forEachInBatches(
    (cursor, take) =>
      prismaBase.worker.findMany({
        where: {
          employmentStatus: { not: "TERMINATED" },
          rtwChecks: { none: { nextCheckDueAt: { not: null } } },
          ...(cursor ? { id: { gt: cursor } } : {}),
        },
        orderBy: { id: "asc" },
        take,
        select: { id: true, tenantId: true },
      }),
    async (w) => {
      try {
        await pruneStalePendingRtwRecheckEvents(prismaBase, { ...w, rtwNext: null });
      } catch (e) {
        logger.error("rtw stale prune (no next due) failed", e, { workerId: w.id });
      }
      return 0;
    },
    BATCH
  );

  // ── 4. Sponsorship bitiş bildirimleri — batch ────────────────────────────
  const sponsorshipEndingEventsCreated = await forEachInBatches(
    (cursor, take) =>
      prismaBase.worker.findMany({
        where: {
          employmentStatus: { not: "TERMINATED" },
          sponsorshipEndDate: { not: null },
          ...(cursor ? { id: { gt: cursor } } : {}),
        },
        orderBy: { id: "asc" },
        take,
        select: {
          id: true,
          tenantId: true,
          sponsorshipEndDate: true,
          firstName: true,
          lastName: true,
          cosReference: true,
        },
      }),
    async (w) => {
      if (!w.sponsorshipEndDate) return 0;
      const rows = dateWindowNotificationsToCreate({
        workerId: w.id,
        tenantId: w.tenantId,
        targetDate: w.sponsorshipEndDate,
        windows: SPONSORSHIP_END_WINDOWS,
        idKey: "sponsorship-end",
        metadataKey: "sponsorshipEndDate",
        workerLabel: { firstName: w.firstName, lastName: w.lastName, cosReference: w.cosReference },
      });
      let created = 0;
      for (const row of rows) {
        try {
          await prismaBase.notificationEvent.upsert({
            where: { idempotencyKey: row.idempotencyKey as string },
            create: row,
            update: {},
          });
          created += 1;
        } catch (e) {
          logger.error("sponsorship ending notification upsert failed", e, { workerId: w.id });
        }
      }
      try {
        await pruneStalePendingSponsorshipEndingEvents(prismaBase, w);
      } catch (e) {
        logger.error("sponsorship ending stale prune failed", e, { workerId: w.id });
      }
      return created;
    },
    BATCH
  );

  // Sponsorship tarihi olmayan worker'lar için stale prune
  await forEachInBatches(
    (cursor, take) =>
      prismaBase.worker.findMany({
        where: {
          employmentStatus: { not: "TERMINATED" },
          sponsorshipEndDate: null,
          ...(cursor ? { id: { gt: cursor } } : {}),
        },
        orderBy: { id: "asc" },
        take,
        select: { id: true, tenantId: true },
      }),
    async (w) => {
      try {
        await pruneStalePendingSponsorshipEndingEvents(prismaBase, { ...w, sponsorshipEndDate: null });
      } catch (e) {
        logger.error("sponsorship stale prune (no end date) failed", e, { workerId: w.id });
      }
      return 0;
    },
    BATCH
  );

  // ── 5. Belge süresi bildirimleri — batch ─────────────────────────────────
  const in30 = new Date(now);
  in30.setDate(in30.getDate() + 30);

  const documentEventsCreated = await forEachInBatches(
    (cursor, take) =>
      prismaBase.document.findMany({
        where: {
          isDeleted: false,
          expiryDate: { not: null },
          ...(cursor ? { id: { gt: cursor } } : {}),
        },
        orderBy: { id: "asc" },
        take,
        select: { id: true, workerId: true, tenantId: true, expiryDate: true },
      }),
    async (d) => {
      if (!d.expiryDate) return 0;
      if (d.expiryDate > in30 || d.expiryDate < now) return 0;
      const dayStr = startOfDay(d.expiryDate).toISOString().slice(0, 10);
      const key = `doc:${d.workerId}:${d.id}:DOCUMENT_EXPIRING:${dayStr}`;
      try {
        const worker = await prismaBase.worker.findUnique({
          where: { id: d.workerId },
          select: { firstName: true, lastName: true, cosReference: true },
        });
        const workerName = worker ? `${worker.firstName} ${worker.lastName}` : "Worker";
        const cosRef = worker?.cosReference ?? "";
        await prismaBase.notificationEvent.upsert({
          where: { idempotencyKey: key },
          create: {
            workerId: d.workerId,
            tenantId: d.tenantId,
            eventType: "DOCUMENT_EXPIRING",
            idempotencyKey: key,
            dueDate: startOfDay(d.expiryDate),
            reportDeadlineAt: startOfDay(d.expiryDate),
            occurredAt: new Date(),
            status: "PENDING",
            metadata: { documentId: d.id },
            smsDraft: getSmsDraft("DOCUMENT_EXPIRING", { workerName, cosRef }),
            evidenceRequired: getEvidenceHint("DOCUMENT_EXPIRING"),
          },
          update: {},
        });
        return 1;
      } catch (e) {
        logger.error("document notification upsert failed", e, { documentId: d.id });
        return 0;
      }
    },
    BATCH
  );

  // ── 6. Escalation, missing docs, email bildirimleri ──────────────────────
  const { level3Logged } = await processEscalationNotifications(prismaBase, now);
  const { created: missingDocEvents } = await processMissingDocumentNotifications(prismaBase, now);
  const { sent: documentExpiryEmailsSent, skippedNoSmtp: documentExpiryEmailSkippedNoSmtp } =
    await processExpiredDocumentEmails(prismaBase, now);
  const {
    sent: notificationExpiryEmailsSent,
    skippedNoSmtp: notificationExpiryEmailSkippedNoSmtp,
  } = await processVisaAndSponsorshipExpiries(prismaBase, now);
  const documentExpiringNotificationsClosed =
    await closeStaleDocumentExpiringNotifications(prismaBase, { now });

  const summary = {
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
  logger.info("runDailyCron: completed", summary);
  return summary;
}
