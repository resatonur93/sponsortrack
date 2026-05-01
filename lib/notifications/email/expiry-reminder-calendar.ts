import type { DocumentExpiryReminderKind } from "@prisma/client";

/** Canonical list for SMTP sweep loops (60/30/7, due day, post-expiry snapshot). */
export const DOCUMENT_EXPIRY_REMINDER_KINDS: DocumentExpiryReminderKind[] = [
  "BEFORE_60",
  "BEFORE_30",
  "BEFORE_7",
  "EXPIRY_DAY",
  "AFTER_EXPIRED",
];

/** `daysFromTodayToAnchor` = daysBetween(today, anchor) per `lib/dates` (positive = anchor in future). */
export function expiryReminderKindMatchesCalendar(
  kind: DocumentExpiryReminderKind,
  daysFromTodayToAnchor: number
): boolean {
  switch (kind) {
    case "BEFORE_60":
      return daysFromTodayToAnchor === 60;
    case "BEFORE_30":
      return daysFromTodayToAnchor === 30;
    case "BEFORE_7":
      return daysFromTodayToAnchor === 7;
    case "EXPIRY_DAY":
      return daysFromTodayToAnchor === 0;
    case "AFTER_EXPIRED":
      return daysFromTodayToAnchor < 0;
    default:
      return false;
  }
}
