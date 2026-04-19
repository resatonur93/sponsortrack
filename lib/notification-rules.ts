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
  { type: "VISA_EXPIRING_90_DAYS", daysBefore: 90 },
  { type: "VISA_EXPIRING_30_DAYS", daysBefore: 30 },
  { type: "VISA_EXPIRING_7_DAYS", daysBefore: 7 },
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
