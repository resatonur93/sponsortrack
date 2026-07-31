import type { AbsenceType } from "@prisma/client";
import { countWorkingDaysInclusive } from "@/lib/uk-working-days";

const DAY_MS = 86400000;

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

/**
 * Bir bordro dönemiyle çakışan UNPAID_LEAVE günlerinin toplamı (döneme kırpılmış).
 * computeExpectedForPeriod'daki gün tanımıyla tutarlı (round((end-start)/gün)) — beklenen
 * maaşı ücretsiz izne göre uyarlarken bu sayı kullanılır.
 */
export function unpaidLeaveDaysInPeriod(
  period: { start: Date; end: Date },
  absences: { type: AbsenceType; startDate: Date; endDate: Date | null }[]
): number {
  let total = 0;
  for (const a of absences) {
    if (a.type !== "UNPAID_LEAVE") continue;
    const absenceEnd = a.endDate ?? period.end;
    const overlapStart = Math.max(a.startDate.getTime(), period.start.getTime());
    const overlapEnd = Math.min(absenceEnd.getTime(), period.end.getTime());
    if (overlapEnd <= overlapStart) continue;
    total += Math.round((overlapEnd - overlapStart) / DAY_MS);
  }
  return total;
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
