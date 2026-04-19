import type { NotificationType } from "@prisma/client";
import { daysBetween } from "@/lib/dates";
import { countUkWorkingDaysAfterThrough } from "@/lib/uk-working-days";
import { usesCalendarDaysOnly } from "@/lib/deadline-rules";

export function formatDeadlineWindowLabel(
  eventType: NotificationType,
  occurredAt: Date | string | null | undefined,
  reportDeadlineAt: Date | string | null | undefined
): string | null {
  if (!occurredAt || !reportDeadlineAt) return null;
  const o = new Date(occurredAt);
  const r = new Date(reportDeadlineAt);
  if (usesCalendarDaysOnly(eventType)) {
    const n = daysBetween(o, r);
    return `${n} calendar day(s)`;
  }
  const n = countUkWorkingDaysAfterThrough(o, r);
  return `${n} UK working day(s)`;
}
