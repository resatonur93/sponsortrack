import type { NotificationType } from "@prisma/client";
import { addDays } from "@/lib/dates";
import { addWorkingDays } from "@/lib/uk-working-days";

/**
 * Report deadline from occurrence date, per UK sponsor reporting norms in-app.
 * NO_SHOW: 28 calendar days (unchanged).
 */
export function getReportDeadlineForEvent(
  eventType: NotificationType,
  occurredAt: Date
): Date {
  switch (eventType) {
    case "NO_SHOW":
      return addDays(occurredAt, 28);
    case "ORGANISATION_CHANGE":
    case "ORGANISATION_SIZE_CHANGE":
    case "MERGER_TUPE_RESTRUCTURING":
    case "CHARITY_STATUS_CHANGE":
    case "KEY_PERSONNEL_CHANGE":
      return addWorkingDays(occurredAt, 20);
    case "SALARY_REDUCTION":
    case "WORK_LOCATION_CHANGE":
    case "CHANGE_OF_ROLE_OR_DUTIES":
    case "PROMOTION_SAME_SOC":
    case "ADDRESS_CONTACT_UPDATE":
    case "SPONSORSHIP_ENDED":
    case "OFFSHORE_ARRIVAL":
    case "OFFSHORE_DEPARTURE":
    case "INSOLVENCY_RELATED":
    case "UNAUTHORISED_ABSENCE":
    case "UNPAID_OR_REDUCED_PAY_ABSENCE":
    case "WORKER_MISSING_DOCUMENTS":
    case "SALARY_DISCREPANCY":
    case "DOCUMENT_EXPIRING":
    case "VISA_EXPIRING_90_DAYS":
    case "VISA_EXPIRING_60_DAYS":
    case "VISA_EXPIRING_30_DAYS":
    case "VISA_EXPIRING_7_DAYS":
    case "RIGHT_TO_WORK_RECHECK_60_DAYS":
    case "RIGHT_TO_WORK_RECHECK_30_DAYS":
    case "RIGHT_TO_WORK_RECHECK_7_DAYS":
    case "SPONSORSHIP_ENDING_60_DAYS":
    case "SPONSORSHIP_ENDING_30_DAYS":
    case "SPONSORSHIP_ENDING_7_DAYS":
      return addWorkingDays(occurredAt, 10);
    default:
      return addWorkingDays(occurredAt, 10);
  }
}

export function usesCalendarDaysOnly(eventType: NotificationType): boolean {
  return eventType === "NO_SHOW";
}
