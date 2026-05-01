import type { NotificationType } from "@prisma/client";
import type { Locale } from "@/lib/i18n/types";
import { daysBetween } from "@/lib/dates";
import { countUkWorkingDaysAfterThrough } from "@/lib/uk-working-days";
import { usesCalendarDaysOnly } from "@/lib/deadline-rules";

export function formatDeadlineWindowLabel(
  eventType: NotificationType,
  occurredAt: Date | string | null | undefined,
  reportDeadlineAt: Date | string | null | undefined,
  locale: Locale = "en"
): string | null {
  if (!occurredAt || !reportDeadlineAt) return null;
  const o = new Date(occurredAt);
  const r = new Date(reportDeadlineAt);
  const isTr = locale === "tr";
  if (usesCalendarDaysOnly(eventType)) {
    const n = daysBetween(o, r);
    return isTr ? `${n} takvim günü` : `${n} calendar day(s)`;
  }
  const n = countUkWorkingDaysAfterThrough(o, r);
  return isTr
    ? `${n} Birleşik Krallık iş günü`
    : `${n} UK working day(s)`;
}
