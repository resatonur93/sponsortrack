import type { PrismaClient } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { logger } from "@/lib/logger";

export const DOCUMENT_EXPIRY_NOTIFICATION_CLOSURE_REASON = "DOCUMENT_EXPIRY_PASSED" as const;

function readDocumentId(metadata: unknown): string | undefined {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return undefined;
  const id = (metadata as { documentId?: unknown }).documentId;
  return typeof id === "string" ? id : undefined;
}

function mergeMetadata(
  existing: unknown,
  patch: Record<string, string>
): Prisma.InputJsonValue {
  const base =
    existing && typeof existing === "object" && !Array.isArray(existing)
      ? { ...(existing as Record<string, unknown>) }
      : {};
  return { ...base, ...patch } as Prisma.InputJsonValue;
}

/**
 * DOCUMENT_EXPIRING bildirimleri: belge bitiş tarihi geçtiyse artık bekleyen uyarı değildir.
 */
export async function closeStaleDocumentExpiringNotifications(
  db: PrismaClient,
  options?: { tenantId?: string; now?: Date }
): Promise<number> {
  const now = options?.now ?? new Date();
  const where: Prisma.NotificationEventWhereInput = {
    eventType: "DOCUMENT_EXPIRING",
    status: { in: ["PENDING", "OVERDUE"] },
    ...(options?.tenantId ? { tenantId: options.tenantId } : {}),
  };

  const candidates = await db.notificationEvent.findMany({
    where,
    select: { id: true, metadata: true, tenantId: true },
  });

  let closed = 0;
  for (const ev of candidates) {
    const docId = readDocumentId(ev.metadata);
    if (!docId) continue;

    const doc = await db.document.findFirst({
      where: { id: docId, tenantId: ev.tenantId, isDeleted: false },
      select: { expiryDate: true },
    });
    if (!doc?.expiryDate || doc.expiryDate >= now) continue;

    try {
      await db.notificationEvent.update({
        where: { id: ev.id },
        data: {
          status: "COMPLETED",
          metadata: mergeMetadata(ev.metadata, {
            closureReason: DOCUMENT_EXPIRY_NOTIFICATION_CLOSURE_REASON,
            closedAt: now.toISOString(),
          }),
        },
      });
      closed += 1;
    } catch (e) {
      logger.error("close stale DOCUMENT_EXPIRING notification failed", e, {
        notificationId: ev.id,
      });
    }
  }

  return closed;
}

export function isClosedForExpiredDocument(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return false;
  return (
    (metadata as { closureReason?: string }).closureReason ===
    DOCUMENT_EXPIRY_NOTIFICATION_CLOSURE_REASON
  );
}
