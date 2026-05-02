/**
 * Audit dashboard chart helpers — safe for client bundles (no Prisma / DB).
 * Aggregates live in `@/lib/audit-dashboard-data` (`buildAuditDashboardPayload`).
 */
import type { ComplianceRiskLevel } from "@prisma/client";

/** Severity order for charts and legends (worst first). */
export const AUDIT_RISK_LEVEL_ORDER = [
  "CRITICAL",
  "HIGH",
  "MEDIUM",
  "LOW",
] as const satisfies readonly ComplianceRiskLevel[];

export const AUDIT_RISK_CHART_COLORS: Record<ComplianceRiskLevel, string> = {
  LOW: "#16a34a",
  MEDIUM: "#ca8a04",
  HIGH: "#ea580c",
  CRITICAL: "#dc2626",
};

/** Pie / donut slices; zero buckets omitted for clearer arcs. */
export function auditRiskPieData(
  riskSummary: Record<ComplianceRiskLevel, number>
): { name: ComplianceRiskLevel; value: number; fill: string }[] {
  return AUDIT_RISK_LEVEL_ORDER.filter((lvl) => (riskSummary[lvl] ?? 0) > 0).map(
    (level) => ({
      name: level,
      value: riskSummary[level],
      fill: AUDIT_RISK_CHART_COLORS[level],
    })
  );
}

/** Bar rows in stable order (keeps zeros for axis context). */
export function auditRiskBarData(riskSummary: Record<ComplianceRiskLevel, number>) {
  return AUDIT_RISK_LEVEL_ORDER.map((level) => ({
    level,
    count: riskSummary[level] ?? 0,
    fill: AUDIT_RISK_CHART_COLORS[level],
  }));
}

export function auditRiskTotals(
  riskSummary: Record<ComplianceRiskLevel, number>
): number {
  return AUDIT_RISK_LEVEL_ORDER.reduce(
    (acc, lvl) => acc + (riskSummary[lvl] ?? 0),
    0
  );
}
