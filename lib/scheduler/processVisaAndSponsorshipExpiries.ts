import type { PrismaClient } from "@prisma/client";
import { logger } from "@/lib/logger";
import { processVisaAndSponsorshipExpiries as runNotificationExpiryEmails } from "@/lib/notifications/email/notification-expiry-email";

/**
 * Günlük cron parçası: vize / RTW / sponsorluk / CoS hatırlatma e-postaları.
 * İdempotent: `sendComplianceAnchorEmail` gönderiden önce `NotificationEmailLog` üzerinde
 * `workerId + anchorDomain + anchorDay + reminderKind` kombinasyonuna bakar; kayıt varsa tekrar e-posta yok.
 * Liste tarafında tekrarlayan NotificationEvent kayıtları ise `cron-logic` içindeki stale prune ile sınırlı tutulur.
 */
export async function processVisaAndSponsorshipExpiries(
  db: PrismaClient,
  now: Date = new Date()
): Promise<{ sent: number; skippedNoSmtp: boolean }> {
  logger.info("scheduler.processVisaAndSponsorshipExpiries: start", {
    now: now.toISOString(),
  });
  try {
    const result = await runNotificationExpiryEmails(db, now);
    logger.info("scheduler.processVisaAndSponsorshipExpiries: done", result);
    return result;
  } catch (e) {
    logger.error("scheduler.processVisaAndSponsorshipExpiries: failed", e);
    throw e;
  }
}
