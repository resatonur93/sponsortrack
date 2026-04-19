/**
 * UK (England & Wales) bank holidays + working day helpers.
 * Static lists aligned with gov.uk published dates (2024–2026).
 */

const UK_BANK_HOLIDAYS = new Set<string>([
  // 2024
  "2024-01-01",
  "2024-03-29",
  "2024-04-01",
  "2024-05-06",
  "2024-05-27",
  "2024-08-26",
  "2024-12-25",
  "2024-12-26",
  // 2025
  "2025-01-01",
  "2025-04-18",
  "2025-04-21",
  "2025-05-05",
  "2025-05-26",
  "2025-08-25",
  "2025-12-25",
  "2025-12-26",
  // 2026
  "2026-01-01",
  "2026-04-03",
  "2026-04-06",
  "2026-05-04",
  "2026-05-25",
  "2026-08-31",
  "2026-12-25",
  "2026-12-26",
]);

export function toDateOnlyIso(d: Date): string {
  const x = new Date(d);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, "0");
  const day = String(x.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Monday–Friday, excluding England & Wales bank holidays. */
export function isWorkingDay(d: Date): boolean {
  const day = d.getDay();
  if (day === 0 || day === 6) return false;
  return !UK_BANK_HOLIDAYS.has(toDateOnlyIso(d));
}

export function getNextWorkingDay(d: Date): Date {
  let x = new Date(d);
  x.setDate(x.getDate() + 1);
  while (!isWorkingDay(x)) {
    x.setDate(x.getDate() + 1);
  }
  return x;
}

/** Adds N UK working days (the end date counts as the Nth working day from start). */
export function addWorkingDays(start: Date, workingDays: number): Date {
  if (workingDays <= 0) return new Date(start);
  let x = new Date(start);
  let n = 0;
  while (n < workingDays) {
    x = getNextWorkingDay(x);
    n += 1;
  }
  return x;
}

/** Inclusive count of UK working days between two dates (start/end calendar days). */
export function countWorkingDaysInclusive(start: Date, end: Date): number {
  let a = new Date(
    Math.min(start.getTime(), end.getTime())
  );
  const b = new Date(Math.max(start.getTime(), end.getTime()));
  let c = 0;
  const cur = new Date(a);
  while (cur <= b) {
    if (isWorkingDay(cur)) c += 1;
    cur.setDate(cur.getDate() + 1);
  }
  return c;
}

/** Expand [start,end] to each calendar day as Date (UTC-safe noon). */
export function eachCalendarDay(start: Date, end: Date): Date[] {
  const out: Date[] = [];
  const cur = new Date(
    Math.min(start.getTime(), end.getTime())
  );
  const last = new Date(Math.max(start.getTime(), end.getTime()));
  while (cur <= last) {
    out.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

/** UK working days only in the inclusive range. */
export function eachUkWorkingDayInRange(start: Date, end: Date): Date[] {
  return eachCalendarDay(start, end).filter(isWorkingDay);
}

/** UK working days strictly after `start` through `end` inclusive. */
export function countUkWorkingDaysAfterThrough(
  start: Date,
  end: Date
): number {
  const a = new Date(start);
  a.setDate(a.getDate() + 1);
  if (a > end) return 0;
  return eachUkWorkingDayInRange(a, end).length;
}
