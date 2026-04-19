import type { NotificationType, Role } from "@prisma/client";
import { getEvidenceHint, getSmsDraft } from "@/lib/compliance-templates";
import { getReportDeadlineForEvent } from "@/lib/deadline-rules";

export function buildComplianceEventData(input: {
  workerId: string;
  tenantId: string;
  eventType: NotificationType;
  idempotencyKey: string;
  dueDate: Date;
  reportDeadlineAt?: Date;
  occurredAt?: Date;
  workerName: string;
  cosReference: string;
  notes?: string | null;
  metadata?: Record<string, unknown>;
  approverRole?: Role;
}): {
  workerId: string;
  tenantId: string;
  eventType: NotificationType;
  idempotencyKey: string;
  dueDate: Date;
  reportDeadlineAt: Date;
  occurredAt: Date;
  status: "PENDING";
  smsDraft: string;
  evidenceRequired: string;
  approverRole: Role;
  notes?: string | null;
  metadata: Record<string, unknown>;
} {
  const occurredAt = input.occurredAt ?? new Date();
  const reportDeadlineAt =
    input.reportDeadlineAt ?? getReportDeadlineForEvent(input.eventType, occurredAt);
  return {
    workerId: input.workerId,
    tenantId: input.tenantId,
    eventType: input.eventType,
    idempotencyKey: input.idempotencyKey,
    dueDate: input.dueDate,
    reportDeadlineAt,
    occurredAt,
    status: "PENDING",
    smsDraft: getSmsDraft(input.eventType, {
      workerName: input.workerName,
      cosRef: input.cosReference,
    }),
    evidenceRequired: getEvidenceHint(input.eventType),
    approverRole: input.approverRole ?? "AUTHORISING_OFFICER",
    notes: input.notes,
    metadata: input.metadata ?? {},
  };
}
