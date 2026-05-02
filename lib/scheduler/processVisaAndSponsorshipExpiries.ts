import type { PrismaClient } from "@prisma/client";
import { logger } from "@/lib/logger";
import { processVisaAndSponsorshipExpiries as runNotificationExpiryEmails } from "@/lib/notifications/email/notification-expiry-email";

/**
 * Günlük cron parçası: vize / RTW / sponsorluk / CoS hatırlatma e-postaları.
 * Uygulama mantığı `notification-expiry-email.ts` içinde; burada yalnızca giriş-çıkış logları.
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
