import type { EventType } from "@prisma/client";
import { addDays } from "@/lib/dates";
import { addWorkingDays } from "@/lib/uk-working-days";
import { prismaBase } from "@/lib/prisma";

/**
 * Rapor son tarihi: NO_SHOW = 28 takvim günü; diğerleri UK iş günü (çoğu 10).
 */
export function getComplianceReportDeadline(
  eventType: EventType,
  eventDate: Date
): Date {
  if (eventType === "NO_SHOW_28_DAYS") {
    return addDays(eventDate, 28);
  }
  return addWorkingDays(eventDate, 10);
}

const EVIDENCE: Record<EventType, string[]> = {
  NO_SHOW_28_DAYS: [
    "Expected start date",
    "Contact / chase log",
    "Onboarding or HR notes",
  ],
  UNAUTHORISED_ABSENCE_10_DAYS: [
    "Absence dates",
    "Manager notes",
    "Contact attempts",
  ],
  REDUCED_PAY_ABSENCE: [
    "Payroll records for affected period",
    "Reason for reduced / unpaid leave",
    "Authorisation or policy reference",
  ],
  SALARY_REDUCTION: [
    "Latest payslip",
    "Contract variation (if any)",
    "Employee notification or consent trail",
  ],
  ROLE_CHANGE: [
    "Updated job description",
    "SOC justification (if code changed)",
    "Internal approval",
  ],
  PROMOTION_SAME_CODE: [
    "Updated job title / duties",
    "Confirmation SOC unchanged",
    "Internal approval",
  ],
  WORK_LOCATION_CHANGE: [
    "New work address evidence",
    "Risk assessment if required",
    "Internal approval email",
  ],
  SPONSORSHIP_ENDED: [
    "Last employment date",
    "Contact attempts",
    "CoS / SMS update notes",
  ],
  OFFSHORE_ARRIVAL: [
    "Vessel / assignment letter",
    "Dates of offshore duty",
  ],
  OFFSHORE_DEPARTURE: [
    "Return to UK / onshore confirmation",
    "Assignment end date",
  ],
  ADDRESS_CHANGE: [
    "Proof of address",
    "Updated HR record",
  ],
  PHONE_CHANGE: [
    "Updated contact record",
    "Internal change log reference",
  ],
  EMAIL_CHANGE: [
    "Updated email on HR / IT systems",
    "Security / access checklist if applicable",
  ],
};

export function getComplianceEvidenceList(eventType: EventType): string[] {
  return EVIDENCE[eventType] ?? ["Supporting documents for this event type"];
}

export function buildComplianceSmsDraft(
  eventType: EventType,
  workerName: string,
  cosReference: string
): string {
  const cos = cosReference ? ` CoS: ${cosReference}.` : "";
  const lines: Record<EventType, string> = {
    NO_SHOW_28_DAYS: `[SMS draft] No-show / non-start: ${workerName}.${cos} Report within 28 calendar days.`,
    UNAUTHORISED_ABSENCE_10_DAYS: `[SMS draft] Unauthorised absence (10 working days rule): ${workerName}.${cos}`,
    REDUCED_PAY_ABSENCE: `[SMS draft] Reduced or unpaid pay absence: ${workerName}.${cos}`,
    SALARY_REDUCTION: `[SMS draft] Salary reduction: ${workerName}.${cos} Attach payslip and variation.`,
    ROLE_CHANGE: `[SMS draft] Role / duties change: ${workerName}.${cos}`,
    PROMOTION_SAME_CODE: `[SMS draft] Promotion (same SOC): ${workerName}.${cos}`,
    WORK_LOCATION_CHANGE: `[SMS draft] Work location change: ${workerName}.${cos}`,
    SPONSORSHIP_ENDED: `[SMS draft] Sponsorship ended: ${workerName}.${cos}`,
    OFFSHORE_ARRIVAL: `[SMS draft] Offshore assignment start: ${workerName}.${cos}`,
    OFFSHORE_DEPARTURE: `[SMS draft] Offshore assignment end: ${workerName}.${cos}`,
    ADDRESS_CHANGE: `[SMS draft] Address change: ${workerName}.${cos}`,
    PHONE_CHANGE: `[SMS draft] Phone change: ${workerName}.${cos}`,
    EMAIL_CHANGE: `[SMS draft] Email change: ${workerName}.${cos}`,
  };
  return (
    lines[eventType] ??
    `[SMS draft] ${workerName} — ${eventType}.${cos} Check evidence pack and deadline.`
  );
}

export async function createComplianceReportingEvent(input: {
  tenantId: string;
  workerId: string;
  eventType: EventType;
  eventDate: Date;
  workerName: string;
  cosReference: string;
  notes?: string | null;
}): Promise<{ id: string }> {
  const reportDeadline = getComplianceReportDeadline(
    input.eventType,
    input.eventDate
  );
  return prismaBase.complianceEvent.create({
    data: {
      tenantId: input.tenantId,
      workerId: input.workerId,
      eventType: input.eventType,
      eventDate: input.eventDate,
      reportDeadline,
      evidenceRequired: getComplianceEvidenceList(input.eventType),
      smsDraft: buildComplianceSmsDraft(
        input.eventType,
        input.workerName,
        input.cosReference
      ),
      notes: input.notes ?? undefined,
      status: "PENDING",
    },
    select: { id: true },
  });
}

/** Süresi geçmiş açık kayıtları OVERDUE yapar. */
export async function refreshComplianceEventOverdueStatuses(
  tenantId: string
): Promise<void> {
  const now = new Date();
  await prismaBase.complianceEvent.updateMany({
    where: {
      tenantId,
      reportDeadline: { lt: now },
      status: { in: ["PENDING", "UNDER_REVIEW"] },
    },
    data: { status: "OVERDUE" },
  });
}
