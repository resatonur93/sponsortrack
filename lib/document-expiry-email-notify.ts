import { Prisma, Role } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { startOfDay } from "@/lib/dates";
import { logger } from "@/lib/logger";
import { isSmtpConfigured, sendSmtpMail } from "@/lib/email/smtp";

function expiryDayKey(expiryDate: Date): string {
  return startOfDay(expiryDate).toISOString().slice(0, 10);
}

/**
 * Emails kiracının kayıtlı Authorising Officer hesapları; yoksa DOCUMENT_EXPIRY_NOTIFY_TO (yedek).
 */
async function resolveExpiryRecipients(
  db: PrismaClient,
  tenantId: string
): Promise<string[]> {
  const users = await db.user.findMany({
    where: {
      tenantId,
      isActive: true,
      role: Role.AUTHORISING_OFFICER,
    },
    select: { email: true },
  });

  const seen = new Set<string>();
  const out: string[] = [];
  for (const u of users) {
    const raw = u.email.trim();
    if (!raw) continue;
    const key = raw.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(raw);
  }

  if (out.length > 0) {
    return out;
  }

  const fallback = process.env.DOCUMENT_EXPIRY_NOTIFY_TO?.trim();
  if (fallback) {
    return [fallback];
  }

  logger.warn("document expiry email: no active Authorising Officer for tenant", {
    tenantId,
  });
  return [];
}

export async function tryNotifyExpiredDocumentById(
  db: PrismaClient,
  documentId: string,
  now: Date = new Date()
): Promise<boolean> {
  if (!isSmtpConfigured()) {
    return false;
  }

  const doc = await db.document.findFirst({
    where: { id: documentId, isDeleted: false },
    select: {
      id: true,
      tenantId: true,
      workerId: true,
      expiryDate: true,
      documentType: true,
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

  if (!doc?.expiryDate || doc.expiryDate >= now) {
    return false;
  }
  if (doc.worker.employmentStatus === "TERMINATED") {
    return false;
  }

  const expiryDay = expiryDayKey(doc.expiryDate);
  const exists = await db.documentExpiryEmailLog.findUnique({
    where: {
      documentId_expiryDay: { documentId: doc.id, expiryDay },
    },
  });
  if (exists) {
    return false;
  }

  const recipientList = await resolveExpiryRecipients(db, doc.tenantId);
  if (recipientList.length === 0) {
    return false;
  }

  const to = recipientList.join(", ");
  const baseRaw = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const baseUrl = baseRaw.replace(/\/$/, "");
  const workerLabel = `${doc.worker.firstName} ${doc.worker.lastName}`;
  const subject = `[SponsorTrack] Expired document — ${doc.tenant.companyName} / ${workerLabel}`;
  const text = [
    "A worker document has expired.",
    "",
    `Organisation: ${doc.tenant.companyName}`,
    `Worker: ${workerLabel}`,
    `CoS reference: ${doc.worker.cosReference}`,
    `Document type: ${doc.documentType}`,
    `File name: ${doc.fileName}`,
    `Expiry date (UTC day): ${expiryDay}`,
    `Document ID: ${doc.id}`,
    `Worker record: ${baseUrl}/workers/${doc.workerId}`,
    "",
    "This is an automated message from SponsorTrack.",
  ].join("\n");

  const sent = await sendSmtpMail({ to, subject, text });
  if (!sent) {
    return false;
  }

  try {
    await db.documentExpiryEmailLog.create({
      data: {
        documentId: doc.id,
        expiryDay,
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

  const docs = await db.document.findMany({
    where: {
      isDeleted: false,
      expiryDate: { not: null, lt: now },
      worker: { employmentStatus: { not: "TERMINATED" } },
    },
    select: { id: true },
  });

  let sent = 0;
  for (const row of docs) {
    try {
      if (await tryNotifyExpiredDocumentById(db, row.id, now)) {
        sent += 1;
      }
    } catch (e) {
      logger.error("document expiry email failed", e, { documentId: row.id });
    }
  }
  return { sent, skippedNoSmtp: false };
}
