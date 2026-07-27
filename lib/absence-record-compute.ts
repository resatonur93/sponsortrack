import type { AbsenceType } from "@prisma/client";
import { countWorkingDaysInclusive } from "@/lib/uk-working-days";

export function deriveIsAuthorised(type: AbsenceType): boolean {
  return type !== "UNAUTHORISED";
}

/** Bir bordro döneminin, çalışanın UNPAID_LEAVE tipi bir devamsızlığıyla çakışıp çakışmadığını kontrol eder. */
export function overlapsUnpaidLeave(
  period: { start: Date; end: Date },
  absences: { type: AbsenceType; startDate: Date; endDate: Date | null }[]
): boolean {
  return absences.some((a) => {
    if (a.type !== "UNPAID_LEAVE") return false;
    const absenceEnd = a.endDate ?? period.end;
    return a.startDate.getTime() <= period.end.getTime() && absenceEnd.getTime() >= period.start.getTime();
  });
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
