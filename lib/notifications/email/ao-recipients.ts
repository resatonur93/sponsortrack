import { Role, type PrismaClient } from "@prisma/client";
import { logger } from "@/lib/logger";

export function dedupeTrimmedEmails(inputs: (string | null | undefined)[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of inputs) {
    const t = (raw ?? "").trim();
    if (!t) continue;
    const k = t.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out;
}

export async function listAuthorisingOfficerEmails(
  db: PrismaClient,
  tenantId: string
): Promise<string[]> {
  const rows = await db.user.findMany({
    where: { tenantId, isActive: true, role: Role.AUTHORISING_OFFICER },
    select: { email: true },
  });
  return dedupeTrimmedEmails(rows.map((r) => r.email));
}

/** Document-only SMTP: AO first, optional single fallback env recipient. */
export async function resolveDocumentExpiryRecipients(
  db: PrismaClient,
  tenantId: string
): Promise<string[]> {
  const ao = await listAuthorisingOfficerEmails(db, tenantId);
  if (ao.length > 0) return ao;
  const fallback = process.env.DOCUMENT_EXPIRY_NOTIFY_TO?.trim();
  if (fallback) return [fallback];
  logger.warn("document expiry email: no active Authorising Officer for tenant", { tenantId });
  return [];
}

/**
 * AO + extra addresses (line managers etc.); fallback NOTIFICATION_EXPIRY_NOTIFY_TO then DOCUMENT_EXPIRY_NOTIFY_TO.
 */
export async function resolveComplianceReminderRecipients(
  db: PrismaClient,
  tenantId: string,
  extras: readonly (string | null | undefined)[]
): Promise<string[]> {
  const ao = await listAuthorisingOfficerEmails(db, tenantId);
  const merged = dedupeTrimmedEmails([...ao, ...extras]);
  if (merged.length > 0) return merged;
  const fallback =
    process.env.NOTIFICATION_EXPIRY_NOTIFY_TO?.trim() ||
    process.env.DOCUMENT_EXPIRY_NOTIFY_TO?.trim();
  if (fallback) return [fallback];
  logger.warn("notification expiry email: no Authorising Officers or fallback recipients", {
    tenantId,
  });
  return [];
}
