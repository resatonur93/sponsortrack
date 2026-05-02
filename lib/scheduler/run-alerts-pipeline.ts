import { logger } from "@/lib/logger";
import { runDailyCron } from "@/lib/scheduler/cron-logic";
import { runEscalationAlertsCron } from "@/lib/scheduler/escalation-alerts-cron";

/**
 * Uyarılar sayfasındaki `Alert` satırları için uçtan uca akış:
 * 1) `runDailyCron` — NotificationEvent upsert’leri, eksik belge, günlük bakım, vize e-posta sweep’i.
 * 2) `runEscalationAlertsCron` — Worker vizesi, NotificationEvent son tarihleri, eksik belge vb. → `Alert`.
 *
 * Not: Sadece `/api/cron/run` çalıştırmak escalation adımını **çalıştırmaz**; bu yüzden uyarılar boş kalabilir.
 */
export async function runAlertsPipeline(now: Date = new Date()): Promise<{
  daily: Awaited<ReturnType<typeof runDailyCron>>;
  escalation: Awaited<ReturnType<typeof runEscalationAlertsCron>>;
}> {
  logger.info("runAlertsPipeline: runDailyCron starting");
  const daily = await runDailyCron();
  logger.info("runAlertsPipeline: runDailyCron finished", {
    visaEventsCreated: daily.visaEventsCreated,
    rtwRecheckEventsCreated: daily.rtwRecheckEventsCreated,
    sponsorshipEndingEventsCreated: daily.sponsorshipEndingEventsCreated,
    notificationExpiryEmailsSent: daily.notificationExpiryEmailsSent,
    notificationExpiryEmailSkippedNoSmtp: daily.notificationExpiryEmailSkippedNoSmtp,
  });

  logger.info("runAlertsPipeline: runEscalationAlertsCron starting");
  const escalation = await runEscalationAlertsCron(now);
  logger.info("runAlertsPipeline: runEscalationAlertsCron finished", escalation);

  return { daily, escalation };
}
