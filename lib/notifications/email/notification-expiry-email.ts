import {
  DocumentExpiryReminderKind,
  NotificationComplianceAnchorDomain,
  type NotificationEvent,
  type NotificationType,
  Prisma,
  type PrismaClient,
} from "@prisma/client";
import { addDays, daysBetween, startOfDay } from "@/lib/dates";
import { logger } from "@/lib/logger";
import { isSmtpConfigured, sendSmtpMail } from "@/lib/email/smtp";
import { resolveComplianceReminderRecipients } from "./ao-recipients";
import {
  DOCUMENT_EXPIRY_REMINDER_KINDS,
  expiryReminderKindMatchesCalendar,
} from "./expiry-reminder-calendar";

/**
 * Sends TR+EN compliance emails for visa, RTW recheck due dates, sponsorship end, and CoS expiry anchors.
 *
 * Mirrors `document-expiry-email-notify` idempotency via `NotificationEmailLog`.
 *
 * TODO: Split CoS migrant vs licence assignment horizons when product rules differentiate them.
 */

const EVENT_TYPE_EMAIL_MAP: Partial<
  Record<
    NotificationType,
    { anchorDomain: NotificationComplianceAnchorDomain; reminderKind: DocumentExpiryReminderKind }
  >
> = {
  VISA_EXPIRING_60_DAYS: {
    anchorDomain: "VISA_EXPIRY",
    reminderKind: "BEFORE_60",
  },
  VISA_EXPIRING_30_DAYS: {
    anchorDomain: "VISA_EXPIRY",
    reminderKind: "BEFORE_30",
  },
  VISA_EXPIRING_7_DAYS: {
    anchorDomain: "VISA_EXPIRY",
    reminderKind: "BEFORE_7",
  },
  RIGHT_TO_WORK_RECHECK_60_DAYS: {
    anchorDomain: "RIGHT_TO_WORK_RECHECK",
    reminderKind: "BEFORE_60",
  },
  RIGHT_TO_WORK_RECHECK_30_DAYS: {
    anchorDomain: "RIGHT_TO_WORK_RECHECK",
    reminderKind: "BEFORE_30",
  },
  RIGHT_TO_WORK_RECHECK_7_DAYS: {
    anchorDomain: "RIGHT_TO_WORK_RECHECK",
    reminderKind: "BEFORE_7",
  },
  SPONSORSHIP_ENDING_60_DAYS: {
    anchorDomain: "SPONSORSHIP_END",
    reminderKind: "BEFORE_60",
  },
  SPONSORSHIP_ENDING_30_DAYS: {
    anchorDomain: "SPONSORSHIP_END",
    reminderKind: "BEFORE_30",
  },
  SPONSORSHIP_ENDING_7_DAYS: {
    anchorDomain: "SPONSORSHIP_END",
    reminderKind: "BEFORE_7",
  },
  // Legacy enum — no dedicated template; cron uses worker anchored dates instead.
};

export const NOTIFICATION_EMAIL_EVENT_TYPES = new Set(
  Object.keys(EVENT_TYPE_EMAIL_MAP) as NotificationType[]
);

function anchorDayIso(d: Date): string {
  return startOfDay(d).toISOString().slice(0, 10);
}

function domainLabels(domain: NotificationComplianceAnchorDomain): {
  trTopic: string;
  enTopic: string;
  anchorLabelTr: string;
  anchorLabelEn: string;
} {
  switch (domain) {
    case "VISA_EXPIRY":
      return {
        trTopic: "Vize süresi",
        enTopic: "Visa validity",
        anchorLabelTr: "Vizenin son geçerlilik günü (UTC)",
        anchorLabelEn: "Visa expiry calendar day (UTC)",
      };
    case "RIGHT_TO_WORK_RECHECK":
      return {
        trTopic: "Right to Work yeniden kontrol tarihi",
        enTopic: "Right to Work recheck date",
        anchorLabelTr: "Planlanan RTW kontrol günü (UTC)",
        anchorLabelEn: "Planned RTW recheck calendar day (UTC)",
      };
    case "SPONSORSHIP_END":
      return {
        trTopic: "Sponsorluk süresinin bitişi",
        enTopic: "Sponsorship coverage end date",
        anchorLabelTr: "Sponsorluk bitiş günü (UTC)",
        anchorLabelEn: "Sponsorship end calendar day (UTC)",
      };
    case "COS_EXPIRY":
      return {
        trTopic: "Certificate of Sponsorship (CoS) süresi",
        enTopic: "Certificate of Sponsorship (CoS) validity",
        anchorLabelTr: "CoS son geçerlilik günü (UTC)",
        anchorLabelEn: "CoS expiry calendar day (UTC)",
      };
  }
}

function subjectAndBodyLead(
  kind: DocumentExpiryReminderKind,
  company: string,
  workerLabel: string,
  domain: NotificationComplianceAnchorDomain
): { subject: string; bodyIntroTr: string; bodyIntroEn: string } {
  const { trTopic, enTopic } = domainLabels(domain);
  const whoTr = `${trTopic} · ${company} · ${workerLabel}`;
  const whoEn = `${enTopic} — ${company} — ${workerLabel}`;
  switch (kind) {
    case "BEFORE_60":
      return {
        subject: `[SponsorTrack] Hatırlatma: ${trTopic} — 60 gün · ${workerLabel}`,
        bodyIntroTr: `${whoTr} için kritik tarihe UTC takvimine göre 60 gün kalmıştır.`,
        bodyIntroEn: `${whoEn}: 60 calendar days remain until the UTC anchor date.`,
      };
    case "BEFORE_30":
      return {
        subject: `[SponsorTrack] Hatırlatma: ${trTopic} — 30 gün · ${workerLabel}`,
        bodyIntroTr: `${whoTr} için kritik tarihe UTC takvimine göre 30 gün kalmıştır.`,
        bodyIntroEn: `${whoEn}: 30 calendar days remain until the UTC anchor date.`,
      };
    case "BEFORE_7":
      return {
        subject: `[SponsorTrack] KRİTİK: ${trTopic} — 7 gün · ${workerLabel}`,
        bodyIntroTr: `${whoTr} için kritik tarihe UTC takvimine göre 7 gün kalmıştır.`,
        bodyIntroEn: `${whoEn}: 7 calendar days remain until the UTC anchor date.`,
      };
    case "EXPIRY_DAY":
      return {
        subject: `[SponsorTrack] BUGÜN: ${trTopic} · ${workerLabel}`,
        bodyIntroTr: `${whoTr} için bağlayıcı UTC takvim günü bugündür.`,
        bodyIntroEn: `${whoEn}: today is the scheduled UTC anchor calendar day.`,
      };
    case "AFTER_EXPIRED":
      return {
        subject: `[SponsorTrack] Geciken aksiyon: ${trTopic} · ${workerLabel}`,
        bodyIntroTr: `${whoTr} için kritik tarih geçmiştir; uyum ve raporlama adımlarını gözden geçirin.`,
        bodyIntroEn: `${whoEn}: the UTC anchor date has passed — review sponsorship / reporting duties.`,
      };
    default:
      return {
        subject: `[SponsorTrack] ${trTopic} · ${workerLabel}`,
        bodyIntroTr: "Uyumluluk hatırlatması.",
        bodyIntroEn: "Compliance reminder.",
      };
  }
}

function readMetadataAnchorIso(meta: unknown, keys: readonly string[]): string | null {
  if (!meta || typeof meta !== "object") return null;
  const obj = meta as Record<string, unknown>;
  for (const k of keys) {
    const v = obj[k];
    if (typeof v !== "string") continue;
    const d = Date.parse(v);
    if (!Number.isNaN(d)) return anchorDayIso(new Date(v));
  }
  return null;
}

type WorkerBrief = {
  id: string;
  tenantId: string;
  firstName: string;
  lastName: string;
  cosReference: string;
  employmentStatus: import("@prisma/client").EmploymentStatus;
};

type TenantBrief = { companyName: string };
type ManagerBrief = {
  email: string | null;
  firstName: string | null;
  lastName: string | null;
} | null;

async function sendComplianceAnchorEmail(opts: {
  db: PrismaClient;
  now: Date;
  tenantId: string;
  worker: WorkerBrief;
  tenant: TenantBrief;
  lineManager: ManagerBrief;
  lineManagerEmailOnWorker?: string | null;
  anchorDate: Date;
  anchorDomain: NotificationComplianceAnchorDomain;
  reminderKind: DocumentExpiryReminderKind;
  notificationEventId?: string | null;
  /**
   * When true (NotificationEvent-driven), require `today === event.dueDate` already matched by caller.
   */
  skipCalendarCheck?: boolean;
}): Promise<boolean> {
  const {
    db,
    worker,
    tenant,
    tenantId,
    anchorDate,
    anchorDomain,
    reminderKind,
    notificationEventId,
    now,
    skipCalendarCheck,
  } = opts;

  if (!isSmtpConfigured()) return false;
  if (worker.employmentStatus === "TERMINATED") return false;

  const today = startOfDay(now);
  const d = daysBetween(today, startOfDay(anchorDate));
  if (!skipCalendarCheck && !expiryReminderKindMatchesCalendar(reminderKind, d)) return false;

  const anchorDay = anchorDayIso(anchorDate);

  const existing = await db.notificationEmailLog.findUnique({
    where: {
      workerId_anchorDomain_anchorDay_reminderKind: {
        workerId: worker.id,
        anchorDomain,
        anchorDay,
        reminderKind,
      },
    },
  });
  if (existing) return false;

  const mgrExtras: string[] = [];
  if (opts.lineManager?.email?.trim())
    mgrExtras.push(opts.lineManager.email.trim());
  if (opts.lineManagerEmailOnWorker?.trim())
    mgrExtras.push(opts.lineManagerEmailOnWorker.trim());

  const recipients = await resolveComplianceReminderRecipients(db, tenantId, mgrExtras);
  if (recipients.length === 0) return false;

  const baseRaw = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const baseUrl = baseRaw.replace(/\/$/, "");
  const workerLabel = `${worker.firstName} ${worker.lastName}`;
  const { subject, bodyIntroTr, bodyIntroEn } = subjectAndBodyLead(
    reminderKind,
    tenant.companyName,
    workerLabel,
    anchorDomain
  );
  const { anchorLabelTr, anchorLabelEn } = domainLabels(anchorDomain);
  let managerNote = "";
  if (mgrExtras.length) {
    managerNote = [
      "Yönetici / Manager copy (if listed): ",
      mgrExtras.join(", "),
      "",
    ].join("\n");
  }

  const text = [
    bodyIntroTr,
    "",
    bodyIntroEn,
    "",
    "────────────────",
    "",
    `${anchorLabelTr}: ${anchorDay}`,
    `${anchorLabelEn}: ${anchorDay}`,
    "",
    `Kuruluş / Organisation: ${tenant.companyName}`,
    `Çalışan / Worker: ${workerLabel}`,
    `CoS referansı / CoS reference: ${worker.cosReference}`,
    `Çalışan sayfası / Worker record: ${baseUrl}/workers/${worker.id}`,
    `Bildirimler / Notifications: ${baseUrl}/notifications`,
    ...(notificationEventId
      ? [
          "",
          `Olay bağlantısı (varsa) / Linked notification id (if any): ${notificationEventId}`,
        ]
      : []),
    "",
    managerNote,
    "",
    `UTC bugünü / Today's UTC midnight anchor: ${anchorDayIso(now)}`,
    "",
    "Bu SponsorTrack bildirimi otomatik gönderilmiştir. / Automated message from SponsorTrack.",
  ].join("\n");

  const ok = await sendSmtpMail({ to: recipients.join(", "), subject, text });
  if (!ok) return false;

  try {
    await db.notificationEmailLog.create({
      data: {
        tenantId,
        workerId: worker.id,
        notificationEventId: notificationEventId ?? null,
        anchorDomain,
        anchorDay,
        reminderKind,
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return true;
    }
    throw e;
  }
  return true;
}

/** True when SMTP sent and persisted to `NotificationEmailLog` */
export async function sendExpiryNotificationEmail(
  db: PrismaClient,
  notificationEvent: Pick<NotificationEvent, "id">,
  now: Date = new Date()
): Promise<boolean> {
  const full = await db.notificationEvent.findFirst({
    where: { id: notificationEvent.id },
    include: {
      worker: {
        select: {
          id: true,
          tenantId: true,
          firstName: true,
          lastName: true,
          cosReference: true,
          employmentStatus: true,
          visaExpiryDate: true,
          sponsorshipEndDate: true,
          cosExpiryDate: true,
          lineManagerEmail: true,
          tenant: { select: { companyName: true } },
          lineManager: {
            select: { email: true, firstName: true, lastName: true },
          },
        },
      },
    },
  });
  if (!full) return false;

  const mapped = EVENT_TYPE_EMAIL_MAP[full.eventType];
  if (!mapped) return false;

  const today = startOfDay(now);
  if (startOfDay(full.dueDate).getTime() !== today.getTime()) return false;

  const metaAnchor =
    mapped.anchorDomain === "VISA_EXPIRY"
      ? readMetadataAnchorIso(full.metadata, ["visaExpiry"])
      : mapped.anchorDomain === "RIGHT_TO_WORK_RECHECK"
        ? readMetadataAnchorIso(full.metadata, ["rtwNextCheckDueAt"])
        : mapped.anchorDomain === "SPONSORSHIP_END"
          ? readMetadataAnchorIso(full.metadata, ["sponsorshipEndDate"])
          : null;

  let anchorDate: Date | null = metaAnchor ? new Date(`${metaAnchor}T00:00:00.000Z`) : null;
  if (!anchorDate || Number.isNaN(anchorDate.getTime())) {
    if (mapped.anchorDomain === "VISA_EXPIRY" && full.worker.visaExpiryDate) {
      anchorDate = full.worker.visaExpiryDate;
    } else if (
      mapped.anchorDomain === "SPONSORSHIP_END" &&
      full.worker.sponsorshipEndDate
    ) {
      anchorDate = full.worker.sponsorshipEndDate;
    } else if (mapped.anchorDomain === "COS_EXPIRY" && full.worker.cosExpiryDate) {
      anchorDate = full.worker.cosExpiryDate;
    } else {
      const rtw = await db.rightToWorkCheck.findFirst({
        where: { workerId: full.workerId, tenantId: full.tenantId, nextCheckDueAt: { not: null } },
        orderBy: { nextCheckDueAt: "asc" },
        select: { nextCheckDueAt: true },
      });
      anchorDate = rtw?.nextCheckDueAt ?? null;
    }
  }
  if (!anchorDate) return false;

  const { anchorDomain, reminderKind } = mapped;

  return sendComplianceAnchorEmail({
    db,
    now,
    tenantId: full.tenantId,
    worker: {
      id: full.worker.id,
      tenantId: full.worker.tenantId,
      firstName: full.worker.firstName,
      lastName: full.worker.lastName,
      cosReference: full.worker.cosReference,
      employmentStatus: full.worker.employmentStatus,
    },
    tenant: full.worker.tenant,
    lineManager: full.worker.lineManager,
    lineManagerEmailOnWorker: full.worker.lineManagerEmail,
    anchorDate,
    anchorDomain,
    reminderKind,
    notificationEventId: full.id,
    skipCalendarCheck: true,
  });
}

/**
 * Daily batch: anchored worker dates (visa, RTW, sponsorship, CoS) + reminders that land on today's `dueDate`.
 */
export async function processVisaAndSponsorshipExpiries(
  db: PrismaClient,
  now: Date = new Date()
): Promise<{ sent: number; skippedNoSmtp: boolean }> {
  if (!isSmtpConfigured()) {
    logger.warn(
      "notification expiry email: SMTP not configured (set SMTP_URL or SMTP_HOST + SMTP_PORT) — anchor sweep skipped; NotificationEvent due-today emails also skipped"
    );
    return { sent: 0, skippedNoSmtp: true };
  }

  let sent = 0;

  // `cosExpiryDate` is mandatory on Worker; anchoring scans are cheap versus SMTP.
  const workers = await db.worker.findMany({
    where: {
      employmentStatus: { not: "TERMINATED" },
    },
    select: {
      id: true,
      tenantId: true,
      firstName: true,
      lastName: true,
      cosReference: true,
      employmentStatus: true,
      visaExpiryDate: true,
      sponsorshipEndDate: true,
      cosExpiryDate: true,
      lineManagerEmail: true,
      tenant: { select: { companyName: true } },
      lineManager: {
        select: { email: true, firstName: true, lastName: true },
      },
      rtwChecks: {
        where: { nextCheckDueAt: { not: null } },
        orderBy: { nextCheckDueAt: "asc" },
        take: 1,
        select: { nextCheckDueAt: true },
      },
    },
    take: 8000,
  });

  logger.info("notification expiry email: worker anchor sweep", {
    workerCount: workers.length,
    now: now.toISOString(),
  });

  async function sweepAnchors(params: {
    anchorDate: Date;
    anchorDomain: NotificationComplianceAnchorDomain;
    worker: (typeof workers)[0];
  }): Promise<void> {
    const { anchorDate, anchorDomain, worker } = params;
    for (const kind of DOCUMENT_EXPIRY_REMINDER_KINDS) {
      try {
        if (
          await sendComplianceAnchorEmail({
            db,
            now,
            tenantId: worker.tenantId,
            worker,
            tenant: worker.tenant,
            lineManager: worker.lineManager,
            lineManagerEmailOnWorker: worker.lineManagerEmail,
            anchorDate,
            anchorDomain,
            reminderKind: kind,
            notificationEventId: null,
          })
        )
          sent += 1;
      } catch (e) {
        logger.error("notification expiry email (worker anchor) failed", e, {
          workerId: worker.id,
          anchorDomain,
          kind,
        });
      }
    }
  }

  for (const w of workers) {
    if (w.visaExpiryDate) {
      await sweepAnchors({
        anchorDate: w.visaExpiryDate,
        anchorDomain: "VISA_EXPIRY",
        worker: w,
      });
    }
    if (w.rtwChecks[0]?.nextCheckDueAt) {
      await sweepAnchors({
        anchorDate: w.rtwChecks[0].nextCheckDueAt,
        anchorDomain: "RIGHT_TO_WORK_RECHECK",
        worker: w,
      });
    }
    if (w.sponsorshipEndDate) {
      await sweepAnchors({
        anchorDate: w.sponsorshipEndDate,
        anchorDomain: "SPONSORSHIP_END",
        worker: w,
      });
    }
    if (w.cosExpiryDate) {
      await sweepAnchors({
        anchorDate: w.cosExpiryDate,
        anchorDomain: "COS_EXPIRY",
        worker: w,
      });
    }
  }

  const start = startOfDay(now);
  const endExclusive = addDays(start, 1);
  const events = await db.notificationEvent.findMany({
    where: {
      status: { in: ["PENDING", "OVERDUE"] },
      eventType: {
        in: Array.from(NOTIFICATION_EMAIL_EVENT_TYPES) as NotificationType[],
      },
      dueDate: { gte: start, lt: endExclusive },
    },
    select: { id: true },
    take: 2000,
  });

  for (const ev of events) {
    try {
      if (await sendExpiryNotificationEmail(db, ev, now)) sent += 1;
    } catch (e) {
      logger.error("notification expiry email (notification event due today) failed", e, {
        notificationEventId: ev.id,
      });
    }
  }

  logger.info("notification expiry email: batch complete", {
    sent,
    dueTodayEventCount: events.length,
  });

  return { sent, skippedNoSmtp: false };
}
