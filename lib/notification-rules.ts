import type { NotificationType, Prisma } from "@prisma/client";
import { addDays, startOfDay } from "@/lib/dates";
import { getEvidenceHint, getSmsDraft } from "@/lib/compliance-templates";

export function visaIdempotencyKey(
  workerId: string,
  type: NotificationType,
  visaExpiryIsoDay: string
): string {
  return `worker:${workerId}:${type}:${visaExpiryIsoDay}`;
}

export function documentExpiryIdempotencyKey(
  workerId: string,
  documentId: string,
  expiryIsoDay: string
): string {
  return `doc:${workerId}:${documentId}:DOCUMENT_EXPIRING:${expiryIsoDay}`;
}

export type VisaWindowSpec = {
  type: NotificationType;
  daysBefore: number;
};

export const VISA_WINDOWS: VisaWindowSpec[] = [
  { type: "VISA_EXPIRING_60_DAYS", daysBefore: 60 },
  { type: "VISA_EXPIRING_30_DAYS", daysBefore: 30 },
  { type: "VISA_EXPIRING_7_DAYS", daysBefore: 7 },
];

export const RTW_RECHECK_WINDOWS: VisaWindowSpec[] = [
  { type: "RIGHT_TO_WORK_RECHECK_60_DAYS", daysBefore: 60 },
  { type: "RIGHT_TO_WORK_RECHECK_30_DAYS", daysBefore: 30 },
  { type: "RIGHT_TO_WORK_RECHECK_7_DAYS", daysBefore: 7 },
];

export const SPONSORSHIP_END_WINDOWS: VisaWindowSpec[] = [
  { type: "SPONSORSHIP_ENDING_60_DAYS", daysBefore: 60 },
  { type: "SPONSORSHIP_ENDING_30_DAYS", daysBefore: 30 },
  { type: "SPONSORSHIP_ENDING_7_DAYS", daysBefore: 7 },
];

export function visaNotificationsToCreate(
  workerId: string,
  tenantId: string,
  visaExpiry: Date,
  workerLabel?: { firstName: string; lastName: string; cosReference: string }
): Prisma.NotificationEventCreateManyInput[] {
  const day = startOfDay(visaExpiry);
  const dayStr = day.toISOString().slice(0, 10);
  const workerName = workerLabel
    ? `${workerLabel.firstName} ${workerLabel.lastName}`
    : "Worker";
  const cosRef = workerLabel?.cosReference ?? "";
  const results: Prisma.NotificationEventCreateManyInput[] = [];

  for (const w of VISA_WINDOWS) {
    const due = startOfDay(addDays(day, -w.daysBefore));
    const occurredAt = new Date();
    results.push({
      workerId,
      tenantId,
      eventType: w.type,
      idempotencyKey: visaIdempotencyKey(workerId, w.type, dayStr),
      dueDate: due,
      reportDeadlineAt: due,
      occurredAt,
      status: "PENDING",
      smsDraft: getSmsDraft(w.type, { workerName, cosRef }),
      evidenceRequired: getEvidenceHint(w.type),
      metadata: { visaExpiry: day.toISOString(), windowDays: w.daysBefore },
    });
  }
  return results;
}

export function dateWindowNotificationsToCreate(input: {
  workerId: string;
  tenantId: string;
  targetDate: Date;
  windows: VisaWindowSpec[];
  idKey: string;
  metadataKey: string;
  workerLabel?: { firstName: string; lastName: string; cosReference: string };
}): Prisma.NotificationEventCreateManyInput[] {
  const day = startOfDay(input.targetDate);
  const dayStr = day.toISOString().slice(0, 10);
  const workerName = input.workerLabel
    ? `${input.workerLabel.firstName} ${input.workerLabel.lastName}`
    : "Worker";
  const cosRef = input.workerLabel?.cosReference ?? "";

  return input.windows.map((w) => {
    const due = startOfDay(addDays(day, -w.daysBefore));
    const occurredAt = new Date();
    return {
      workerId: input.workerId,
      tenantId: input.tenantId,
      eventType: w.type,
      idempotencyKey: `worker:${input.workerId}:${w.type}:${input.idKey}:${dayStr}`,
      dueDate: due,
      reportDeadlineAt: due,
      occurredAt,
      status: "PENDING",
      smsDraft: getSmsDraft(w.type, { workerName, cosRef }),
      evidenceRequired: getEvidenceHint(w.type),
      metadata: {
        [input.metadataKey]: day.toISOString(),
        windowDays: w.daysBefore,
      },
    };
  });
}
