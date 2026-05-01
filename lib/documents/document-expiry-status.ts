export type DocumentExpiryBand = "VALID" | "EXPIRING_SOON" | "EXPIRED" | "UNKNOWN";

export function getDocumentExpiryBand(
  expiryDate: Date | null | undefined,
  now: Date = new Date()
): DocumentExpiryBand {
  if (!expiryDate) return "UNKNOWN";
  if (expiryDate < now) return "EXPIRED";
  const limit = new Date(now);
  limit.setDate(limit.getDate() + 30);
  if (expiryDate <= limit) return "EXPIRING_SOON";
  return "VALID";
}
