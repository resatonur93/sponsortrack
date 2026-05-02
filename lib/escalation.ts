import type { NotificationStatus } from "@prisma/client";

export type EscalationLevel = 1 | 2 | 3;

/**
 * LEVEL_1: &gt;7 days — info
 * LEVEL_2: 2–7 days — warning
 * LEVEL_3: overdue or ≤1 day — critical
 */
export function getEscalationLevel(
  deadline: Date,
  now: Date,
  status: NotificationStatus
): EscalationLevel {
  if (status === "OVERDUE") return 3;
  const ms = startOfDayUtc(deadline).getTime() - startOfDayUtc(now).getTime();
  const days = Math.ceil(ms / (1000 * 60 * 60 * 24));
  if (days <= 1) return 3;
  if (days >= 2 && days <= 7) return 2;
  return 1;
}

export function startOfDayUtc(d: Date): Date {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

export function escalationLabel(level: EscalationLevel): string {
  switch (level) {
    case 1:
      return "LEVEL_1";
    case 2:
      return "LEVEL_2";
    case 3:
      return "LEVEL_3";
    default:
      return "LEVEL_1";
  }
}

export function escalationBadgeClass(level: EscalationLevel): string {
  switch (level) {
    case 1:
      return "border-emerald-200 bg-emerald-50 text-emerald-900";
    case 2:
      return "border-amber-200 bg-amber-50 text-amber-950";
    case 3:
      return "border-rose-200 bg-rose-50 text-[#E11D48]";
    default:
      return "bg-slate-100 text-slate-800";
  }
}
