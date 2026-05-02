import type { DocumentFolder, NotificationType } from "@prisma/client";

/**
 * Bildirim türüne göre belge kasasında öne çıkarılacak klasör (yoksa kullanıcıya yalnızca genel liste açılır).
 */
export function notificationSuggestedVaultFolder(
  eventType: NotificationType
): DocumentFolder | null {
  const t = String(eventType);
  if (t.startsWith("VISA_EXPIRING")) return "IDENTITY_IMMIGRATION";
  if (t.startsWith("RIGHT_TO_WORK_RECHECK")) return "RIGHT_TO_WORK";
  if (t.startsWith("SPONSORSHIP_ENDING")) return "COS_APPLICATION";
  if (t === "DOCUMENT_EXPIRING") return "IDENTITY_IMMIGRATION";
  return null;
}

export function documentsPageFolderQuery(folder: DocumentFolder): string {
  return `vaultFolder=${encodeURIComponent(folder)}`;
}
