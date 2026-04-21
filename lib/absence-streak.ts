import type { AbsenceRecord } from "@prisma/client";
import {
  eachUkWorkingDayInRange,
  getNextWorkingDay,
  toDateOnlyIso,
} from "@/lib/uk-working-days";

/** Longest run of consecutive UK working days covered by unauthorised absences. */
export function longestUnauthorisedWorkingDayStreak(
  absences: AbsenceRecord[],
  now: Date = new Date()
): number {
  const unauthorised = absences.filter((a) => a.type === "UNAUTHORISED");
  if (unauthorised.length === 0) return 0;

  const dates = new Set<string>();
  for (const a of unauthorised) {
    const end = a.endDate ?? now;
    for (const d of eachUkWorkingDayInRange(a.startDate, end)) {
      if (d.getTime() <= now.getTime()) dates.add(toDateOnlyIso(d));
    }
  }

  const sorted = Array.from(dates).sort();
  let best = 0;
  let run = 0;
  let prevIso: string | null = null;

  for (const iso of sorted) {
    const cur = new Date(iso + "T12:00:00");
    if (prevIso === null) {
      run = 1;
    } else {
      const prev = new Date(prevIso + "T12:00:00");
      const expectedNext = getNextWorkingDay(prev);
      run =
        toDateOnlyIso(expectedNext) === iso ? run + 1 : 1;
    }
    prevIso = iso;
    best = Math.max(best, run);
  }

  return best;
}
