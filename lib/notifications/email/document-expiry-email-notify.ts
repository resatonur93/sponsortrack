import {
  Prisma,
  type DocumentExpiryReminderKind,
  type NotificationConfig,
  type PrismaClient,
} from "@prisma/client";
import { addDays, daysBetween, startOfDay } from "@/lib/dates";
import {
  documentTypeTitleEn,
  documentTypeTitleTr,
  formatDocumentHumanSummary,
} from "@/lib/documents/document-email-labels";
import {
  buildExpiryReminderEmailHtml,
  buildExpiryReminderPlainTextFallback,
} from "@/lib/emails/templates/expiry-reminder-template";
import { joinSmtpRecipients } from "@/lib/email/recipient-parse";
import { logger } from "@/lib/logger";
import { isSmtpConfigured, sendSmtpMail } from "@/lib/email/smtp";
import {
  collectDocumentExpiryScanUtcDays,
  documentReminderRules,
  reminderKindMatchesConfiguredOffset,
} from "@/lib/notifications/notification-reminder-rules";
import { resolveDocumentExpiryRecipients } from "./ao-recipients";
import { applyTemplateVars } from "./apply-template-vars";
import { documentExpiryDefaultStrings } from "./default-templates";
import { DOCUMENT_EXPIRY_REMINDER_KINDS } from "./expiry-reminder-calendar";
import { coerceEffectiveNotificationConfig } from "./notification-settings-store";
import { documentExpiryTemplateKey } from "./template-keys";

function expiryDayKey(expiryDate: Date): string {
  return startOfDay(expiryDate).toISOString().slice(0, 10);
}

type DocMailPayload = {
  id: string;
  tenantId: string;
  workerId: string;
  expiryDate: Date;
  documentType: import("@prisma/client").DocumentType;
  vaultFolder: import("@prisma/client").DocumentVaultFolder;
  fileName: string;
  worker: {
    employmentStatus: import("@prisma/client").EmploymentStatus;
    firstName: string;
    lastName: string;
    cosReference: string;
  };
  tenant: { companyName: string };
};

async function trySendReminderForLoadedDoc(
  db: PrismaClient,
  doc: DocMailPayload,
  kind: DocumentExpiryReminderKind,
  now: Date,
  config: NotificationConfig
): Promise<boolean> {
  if (!doc.expiryDate || doc.worker.employmentStatus === "TERMINATED") {
    return false;
  }
  if (!config.emailEnabled) return false;

  const today = startOfDay(now);
  const d = daysBetween(today, startOfDay(doc.expiryDate));
  const rules = documentReminderRules(config);
  if (!reminderKindMatchesConfiguredOffset(kind, d, rules)) return false;

  const expiryDay = expiryDayKey(doc.expiryDate);
  const exists = await db.documentExpiryEmailLog.findUnique({
    where: {
      documentId_expiryDay_kind: { documentId: doc.id, expiryDay, kind },
    },
  });
  if (exists) return false;

  const recipients = await resolveDocumentExpiryRecipients(db, doc.tenantId);
  if (recipients.length === 0) return false;

  const baseRaw = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const baseUrl = baseRaw.replace(/\/$/, "");
  const workerLabel = `${doc.worker.firstName} ${doc.worker.lastName}`;
  const docTitleTr = documentTypeTitleTr(doc.documentType);
  const docTitleEn = documentTypeTitleEn(doc.documentType);
  const templateKey = documentExpiryTemplateKey(kind);
  const tpl = await db.emailTemplate.findUnique({
    where: { tenantId_templateKey: { tenantId: doc.tenantId, templateKey } },
  });

  const vars: Record<string, string> = {
    workerName: workerLabel,
    companyName: doc.tenant.companyName,
    expiryDate: expiryDay,
    cosReference: doc.worker.cosReference,
    workerUrl: `${baseUrl}/workers/${doc.workerId}`,
    notificationsUrl: `${baseUrl}/notifications`,
    anchorLabelTr: "Belge bitiş tarihi (UTC)",
    anchorLabelEn: "Document expiry calendar day (UTC)",
    documentTypeTr: docTitleTr,
    documentTypeEn: docTitleEn,
    fileName: doc.fileName,
    documentId: doc.id,
  };

  let subjectTrRaw: string;
  let subjectEnRaw: string;
  let bodyTrRaw: string;
  let bodyEnRaw: string;
  if (tpl) {
    subjectTrRaw = tpl.subjectTr;
    subjectEnRaw = tpl.subjectEn;
    bodyTrRaw = tpl.bodyTr;
    bodyEnRaw = tpl.bodyEn;
  } else {
    const tier =
      kind === "BEFORE_60"
        ? rules.d60.days
        : kind === "BEFORE_30"
          ? rules.d30.days
          : kind === "BEFORE_7"
            ? rules.d7.days
            : undefined;
    const fb = documentExpiryDefaultStrings(kind, tier);
    subjectTrRaw = fb.subjectTr;
    subjectEnRaw = fb.subjectEn;
    bodyTrRaw = fb.bodyTr;
    bodyEnRaw = fb.bodyEn;
  }

  const subject =
    applyTemplateVars(subjectTrRaw, vars).trim() ||
    applyTemplateVars(subjectEnRaw, vars).trim();
  const bodyTr = applyTemplateVars(bodyTrRaw, vars);
  const bodyEn = applyTemplateVars(bodyEnRaw, vars);
  const docBlock = formatDocumentHumanSummary(doc.documentType, doc.vaultFolder);

  const tierAdvance =
    kind === "BEFORE_60"
      ? rules.d60.days
      : kind === "BEFORE_30"
        ? rules.d30.days
        : kind === "BEFORE_7"
          ? rules.d7.days
          : undefined;

  const enrichedHtml = buildExpiryReminderEmailHtml({
    baseUrl,
    variant: "document",
    reminderKind: kind,
    daysRemaining: d,
    expiryDateISO: expiryDay,
    workerName: workerLabel,
    workerId: doc.workerId,
    companyName: doc.tenant.companyName,
    cosReference: doc.worker.cosReference,
    customTitleTr: applyTemplateVars(subjectTrRaw, vars).trim(),
    customTitleEn: applyTemplateVars(subjectEnRaw, vars).trim(),
    tierAdvanceDays: tierAdvance,
    documentLabelTr: docTitleTr,
    documentLabelEn: docTitleEn,
    fileName: doc.fileName,
  });

  const text = [
    buildExpiryReminderPlainTextFallback({
      baseUrl,
      variant: "document",
      reminderKind: kind,
      daysRemaining: d,
      expiryDateISO: expiryDay,
      workerName: workerLabel,
      workerId: doc.workerId,
      companyName: doc.tenant.companyName,
      cosReference: doc.worker.cosReference,
      customTitleTr: applyTemplateVars(subjectTrRaw, vars).trim(),
      customTitleEn: applyTemplateVars(subjectEnRaw, vars).trim(),
      tierAdvanceDays: tierAdvance,
      documentLabelTr: docTitleTr,
      documentLabelEn: docTitleEn,
      fileName: doc.fileName,
    }),
    "",
    "────────────────",
    bodyTr,
    "",
    bodyEn,
    "",
    docBlock,
    `Dosya adı / File name: ${doc.fileName}`,
    `Bitiş tarihi (UTC günü) / Expiry (UTC day): ${expiryDay}`,
    "",
    `Kuruluş / Organisation: ${doc.tenant.companyName}`,
    `Çalışan / Worker: ${workerLabel}`,
    `CoS referansı / CoS reference: ${doc.worker.cosReference}`,
    `Belge kaydı (ID) / Document ID: ${doc.id}`,
    `Çalışan sayfası / Worker record: ${baseUrl}/workers/${doc.workerId}`,
    `Belge kasası / Document vault: ${baseUrl}/workers/${doc.workerId}/documents`,
    "",
    "Bu SponsorTrack sisteminden otomatik gönderilmiştir. / Automated message from SponsorTrack.",
  ].join("\n");

  const ok = await sendSmtpMail({
    to: recipients.join(", "),
    subject,
    text,
    html: enrichedHtml,
    cc: joinSmtpRecipients(config.ccRecipients),
    bcc: joinSmtpRecipients(config.bccRecipients),
  });
  if (!ok) return false;

  try {
    await db.documentExpiryEmailLog.create({
      data: {
        documentId: doc.id,
        expiryDay,
        kind,
        workerId: doc.workerId,
        tenantId: doc.tenantId,
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

async function loadDocMailPayload(db: PrismaClient, documentId: string): Promise<DocMailPayload | null> {
  const doc = await db.document.findFirst({
    where: { id: documentId, isDeleted: false },
    select: {
      id: true,
      tenantId: true,
      workerId: true,
      expiryDate: true,
      documentType: true,
      vaultFolder: true,
      fileName: true,
      worker: {
        select: {
          employmentStatus: true,
          firstName: true,
          lastName: true,
          cosReference: true,
        },
      },
      tenant: { select: { companyName: true } },
    },
  });
  if (!doc?.expiryDate) return null;
  return doc as DocMailPayload;
}

/** Upload veya güncelleme sonrası; o ana uygun olan tüm hatırlatmaları dener (çoğu zaman sıfır veya tek e-posta). */
export async function processDocumentExpiryRemindersForDocumentId(
  db: PrismaClient,
  documentId: string,
  now: Date = new Date()
): Promise<number> {
  if (!isSmtpConfigured()) return 0;

  const doc = await loadDocMailPayload(db, documentId);
  if (!doc) return 0;

  const ncRow = await db.notificationConfig.findUnique({
    where: { tenantId: doc.tenantId },
  });
  const config = coerceEffectiveNotificationConfig(doc.tenantId, ncRow);

  let sent = 0;
  for (const kind of DOCUMENT_EXPIRY_REMINDER_KINDS) {
    try {
      if (await trySendReminderForLoadedDoc(db, doc, kind, now, config)) sent += 1;
    } catch (e) {
      logger.error("document expiry reminder email failed", e, { documentId, kind });
    }
  }
  return sent;
}

/** Bitiş tarihinin UTC günü tam olarak `dayStartUtc` ile çakışan belgeler. */
async function documentIdsWithExpiryUtcDay(
  db: PrismaClient,
  dayStartUtc: Date
): Promise<string[]> {
  const start = startOfDay(dayStartUtc);
  const next = addDays(start, 1);
  const rows = await db.document.findMany({
    where: {
      isDeleted: false,
      expiryDate: { not: null, gte: start, lt: next },
      worker: { employmentStatus: { not: "TERMINATED" } },
    },
    select: { id: true },
    take: 5000,
  });
  return rows.map((r) => r.id);
}

async function documentIdsExpiredBeforeToday(
  db: PrismaClient,
  todayStartUtc: Date
): Promise<string[]> {
  const rows = await db.document.findMany({
    where: {
      isDeleted: false,
      expiryDate: { not: null, lt: todayStartUtc },
      worker: { employmentStatus: { not: "TERMINATED" } },
    },
    select: { id: true },
    take: 5000,
  });
  return rows.map((r) => r.id);
}

/** Cron / toplu: kiracı yapılandırmasındaki gün ofsetleri + son gün + süresi dolmuş. */
export async function processExpiredDocumentEmails(
  db: PrismaClient,
  now: Date = new Date()
): Promise<{ sent: number; skippedNoSmtp: boolean }> {
  if (!isSmtpConfigured()) {
    logger.warn(
      "document expiry email: SMTP not configured (set SMTP_URL or SMTP_HOST + SMTP_PORT)"
    );
    return { sent: 0, skippedNoSmtp: true };
  }

  const today = startOfDay(now);
  const ncRows = await db.notificationConfig.findMany();
  const scanDays = collectDocumentExpiryScanUtcDays(today, ncRows);

  const buckets = await Promise.all(
    scanDays.map((d) => documentIdsWithExpiryUtcDay(db, d))
  );
  const expiredBefore = await documentIdsExpiredBeforeToday(db, today);

  const ids = Array.from(new Set([...buckets.flat(), ...expiredBefore]));
  let sent = 0;
  for (const id of ids) {
    try {
      const n = await processDocumentExpiryRemindersForDocumentId(db, id, now);
      sent += n;
    } catch (e) {
      logger.error("document expiry reminder cron failed", e, { documentId: id });
    }
  }

  return { sent, skippedNoSmtp: false };
}
