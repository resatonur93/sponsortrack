import type { EmploymentStatus, RiskLevel } from "@prisma/client";

/** Row shape returned by GET `/api/risk-scores`. */
export type RiskReportRow = {
  id: string;
  score: number;
  level: RiskLevel;
  calculatedAt: string;
  factors: unknown;
  worker: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    employmentStatus: EmploymentStatus;
  } | null;
};

/**
 * Numeric bands for risk level (exclusive upper bound for LOW/MEDIUM/HIGH).
 * Keep in sync with `scoreToRiskLevel` in `@/lib/risk-scoring-engine`.
 */
export const RISK_SCORE_BAND_MAX = {
  low: 20,
  medium: 50,
  high: 80,
} as const;

export function escapeCsvCell(v: string): string {
  if (/[",\n\r]/.test(v)) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

export function riskReportRowsToCsv(rows: RiskReportRow[], localeTag: string): string {
  const header = ["Worker", "Email", "Score", "Level", "Status", "Calculated"];
  const lines = [
    header.map(escapeCsvCell).join(","),
    ...rows.map((r) => {
      const name = r.worker ? `${r.worker.firstName} ${r.worker.lastName}` : "";
      const email = r.worker?.email ?? "";
      const status = r.worker?.employmentStatus ?? "";
      const calc = new Date(r.calculatedAt).toLocaleString(localeTag);
      return [name, email, String(r.score), r.level, status, calc]
        .map(escapeCsvCell)
        .join(",");
    }),
  ];
  return lines.join("\r\n");
}
