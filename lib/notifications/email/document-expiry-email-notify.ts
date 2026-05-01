import { Prisma, type DocumentExpiryReminderKind, type PrismaClient } from "@prisma/client";
import { addDays, daysBetween, startOfDay } from "@/lib/dates";
import { logger } from "@/lib/logger";
import { isSmtpConfigured, sendSmtpMail } from "@/lib/email/smtp";
import {
  documentTypeTitleTr,
  formatDocumentHumanSummary,
} from "@/lib/documents/document-email-labels";
import {
  DOCUMENT_EXPIRY_REMINDER_KINDS,
  expiryReminderKindMatchesCalendar,
} from "./expiry-reminder-calendar";
import { resolveDocumentExpiryRecipients } from "./ao-recipients";

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

function subjectAndLead(
  kind: DocumentExpiryReminderKind,
  company: string,
  workerLabel: string,
  docTitleTr: string
): { subject: string; bodyIntroTr: string; bodyIntroEn: string } {
  const who = `${docTitleTr} — ${company} / ${workerLabel}`;
  switch (kind) {
    case "BEFORE_60":
      return {
        subject: `[SponsorTrack] Belge: 60 gün kala · ${who}`,
        bodyIntroTr: "Bir çalışan belgesinin süresinin dolmasına UTC takvimine göre 60 gün kalmıştır.",
        bodyIntroEn: "A worker document expires in 60 calendar days (UTC date comparison).",
      };
    case "BEFORE_30":
      return {
        subject: `[SponsorTrack] Belge: 30 gün kala · ${who}`,
        bodyIntroTr: "Bir çalışan belgesinin süresinin dolmasına UTC takvimine göre 30 gün kalmıştır.",
        bodyIntroEn: "A worker document expires in 30 calendar days (UTC date comparison).",
      };
    case "BEFORE_7":
      return {
        subject: `[SponsorTrack] Belge: 7 gün kala · ${who}`,
        bodyIntroTr: "Bir çalışan belgesinin süresinin dolmasına UTC takvimine göre 7 gün kalmıştır.",
        bodyIntroEn: "A worker document expires in 7 calendar days (UTC date comparison).",
      };
    case "EXPIRY_DAY":
      return {
        subject: `[SponsorTrack] Belge: son geçerlilik günü · ${who}`,
        bodyIntroTr:
          "Bu belge için bitiş tarihinin takvimde bugün olduğu bildirilir (UTC gün karşılaştırması).",
        bodyIntroEn: "Today is the document’s expiry calendar day (UTC date comparison).",
      };
    case "AFTER_EXPIRED":
      return {
        subject: `[SponsorTrack] Süresi doldu: ${docTitleTr} · ${company} / ${workerLabel}`,
        bodyIntroTr: "Aşağıdaki çalışan belgesinin süresi (bitiş tarihi) geçmiştir.",
        bodyIntroEn: "The following worker document has passed its expiry date.",
      };
    default:
      return {
        subject: `[SponsorTrack] Belge · ${who}`,
        bodyIntroTr: "Belge bildirimi.",
        bodyIntroEn: "Document notification.",
      };
  }
}

async function trySendReminderForLoadedDoc(
  db: PrismaClient,
  doc: DocMailPayload,
  kind: DocumentExpiryReminderKind,
  now: Date
): Promise<boolean> {
  if (!doc.expiryDate || doc.worker.employmentStatus === "TERMINATED") {
    return false;
  }

  const today = startOfDay(now);
  const d = daysBetween(today, startOfDay(doc.expiryDate));
  if (!expiryReminderKindMatchesCalendar(kind, d)) return false;

  const expiryDay = expiryDayKey(doc.expiryDate);
  const exists = await db.documentExpiryEmailLog.findUnique({
    where: {
      documentId_expiryDay_kind: { documentId: doc.id, expiryDay, kind },
    },
  });
  if (exists) return false;

  const recipients = await resolveDocumentExpiryRecipients(db, doc.tenantId);
  if (recipients.length === 0) return false;

  const to = recipients.join(", ");
  const baseRaw = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const baseUrl = baseRaw.replace(/\/$/, "");
  const workerLabel = `${doc.worker.firstName} ${doc.worker.lastName}`;
  const docTitleTr = documentTypeTitleTr(doc.documentType);
  const { subject, bodyIntroTr, bodyIntroEn } = subjectAndLead(
    kind,
    doc.tenant.companyName,
    workerLabel,
    docTitleTr
  );
  const docBlock = formatDocumentHumanSummary(doc.documentType, doc.vaultFolder);

  const text = [
    bodyIntroTr,
    "",
    bodyIntroEn,
    "",
    "────────────────",
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
    "",
    "Bu SponsorTrack sisteminden otomatik gönderilmiştir. / Automated message from SponsorTrack.",
  ].join("\n");

  const ok = await sendSmtpMail({ to, subject, text });
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

  let sent = 0;
  for (const kind of DOCUMENT_EXPIRY_REMINDER_KINDS) {
    try {
      if (await trySendReminderForLoadedDoc(db, doc, kind, now)) sent += 1;
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

/** Cron / toplu: 60/30/7 gün önce, son gün ve süresi dolmuş için (her biri yalnızca bir kez loglanır). */
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
  const buckets = await Promise.all([
    documentIdsWithExpiryUtcDay(db, addDays(today, 60)),
    documentIdsWithExpiryUtcDay(db, addDays(today, 30)),
    documentIdsWithExpiryUtcDay(db, addDays(today, 7)),
    documentIdsWithExpiryUtcDay(db, today),
    documentIdsExpiredBeforeToday(db, today),
  ]);

  const ids = Array.from(new Set(buckets.flat()));
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
