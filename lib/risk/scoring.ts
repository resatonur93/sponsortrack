/**
 * Risk scoring integration surface for UI and batch jobs.
 * Full engine & factors: `@/lib/risk-scoring-engine`.
 * Scheduled run: `@/lib/scheduler` → `runRiskScoringForTenant`.
 */

export { scoreToRiskLevel } from "@/lib/risk-scoring-engine";
export type { RiskReportRow } from "./report";
export { escapeCsvCell, RISK_SCORE_BAND_MAX, riskReportRowsToCsv } from "./report";
