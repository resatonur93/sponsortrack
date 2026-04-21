import type { AbsenceType } from "@prisma/client";
import { countWorkingDaysInclusive } from "@/lib/uk-working-days";

export function deriveIsAuthorised(type: AbsenceType): boolean {
  return type !== "UNAUTHORISED";
}

export function computeAbsenceWorkingDayMetrics(
  startDate: Date,
  endDate: Date | null,
  type: AbsenceType,
  now: Date = new Date()
): { consecutiveWorkingDays: number; isReportable: boolean } {
  const end = endDate ?? now;
  const effectiveEnd = new Date(Math.min(end.getTime(), now.getTime()));
  const consecutiveWorkingDays = countWorkingDaysInclusive(startDate, effectiveEnd);
  const isReportable =
    type === "UNAUTHORISED" && consecutiveWorkingDays >= 10;
  return { consecutiveWorkingDays, isReportable };
}
