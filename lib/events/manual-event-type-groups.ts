import type { EventType } from "@prisma/client";

/** Grouped presets for manual compliance event creation (covers full `EventType` enum). */
export const MANUAL_EVENT_TYPE_GROUPS: {
  labelKey: string;
  types: EventType[];
}[] = [
  {
    labelKey: "events.typeGroup.attendance",
    types: [
      "NO_SHOW_28_DAYS",
      "UNAUTHORISED_ABSENCE_10_DAYS",
      "REDUCED_PAY_ABSENCE",
    ],
  },
  {
    labelKey: "events.typeGroup.payRole",
    types: ["SALARY_REDUCTION", "ROLE_CHANGE", "PROMOTION_SAME_CODE"],
  },
  {
    labelKey: "events.typeGroup.locationSponsor",
    types: [
      "WORK_LOCATION_CHANGE",
      "SPONSORSHIP_ENDED",
      "OFFSHORE_ARRIVAL",
      "OFFSHORE_DEPARTURE",
    ],
  },
  {
    labelKey: "events.typeGroup.contact",
    types: ["ADDRESS_CHANGE", "PHONE_CHANGE", "EMAIL_CHANGE"],
  },
];
