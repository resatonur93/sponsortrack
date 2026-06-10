import type { ComplianceRiskLevel, NotificationStatus } from "@prisma/client";

/**
 * Hızlı, DB'ye ek sorgu atmadan hesaplanan risk snapshot'u.
 * Worker GET/PUT sırasında `riskSnapshot` alanı ve `complianceRiskLevel`
 * güncellenmesi için kullanılır.
 *
 * Kapsamlı risk raporu için `lib/risk-scoring-engine.ts` ve `RiskScore` modelini kullanın.
 */
export function computeWorkerRiskSnapshot(input: {
  notifications: { status: NotificationStatus }[];
  documents: { expiryDate: Date | null }[];
}): ComplianceRiskLevel {
  const overdue = input.notifications.filter((n) => n.status === "OVERDUE").length;
  const pending = input.notifications.filter((n) => n.status === "PENDING").length;
  const soon = new Date();
  soon.setDate(soon.getDate() + 30);
  const docExpiringSoon = input.documents.some(
    (d) => d.expiryDate && d.expiryDate < soon && d.expiryDate > new Date()
  );
  if (overdue > 0) return "CRITICAL";
  if (pending > 2 || docExpiringSoon) return "HIGH";
  if (pending > 0) return "MEDIUM";
  return "LOW";
}
