import type { Prisma, Worker } from "@prisma/client";
import { prismaBase } from "@/lib/prisma";
import { buildComplianceEventData } from "@/lib/compliance-event-factory";
import { createComplianceReportingEvent } from "@/lib/compliance-reporting-engine";
import { getReportDeadlineForEvent } from "@/lib/deadline-rules";

type ContactSlice = Pick<
  Worker,
  | "currentAddress"
  | "phone"
  | "personalEmail"
  | "emergencyContact"
  | "emergencyPhone"
>;

export async function emitSelfServiceProfileChanges(input: {
  tenantId: string;
  workerId: string;
  before: ContactSlice;
  after: ContactSlice;
  workerName: string;
  cosReference: string;
}): Promise<void> {
  const { tenantId, workerId, before, after, workerName, cosReference } = input;
  const occurred = new Date();

  async function notifyContact(
    idempotencySuffix: string,
    notes: string,
    metadata: Record<string, unknown>
  ): Promise<void> {
    const deadline = getReportDeadlineForEvent("ADDRESS_CONTACT_UPDATE", occurred);
    const key = `${workerId}-ss-${idempotencySuffix}-${Date.now()}`;
    const payload = buildComplianceEventData({
      workerId,
      tenantId,
      eventType: "ADDRESS_CONTACT_UPDATE",
      idempotencyKey: key,
      dueDate: deadline,
      reportDeadlineAt: deadline,
      occurredAt: occurred,
      workerName,
      cosReference,
      notes,
      metadata: { source: "self_service", ...metadata },
    });
    await prismaBase.notificationEvent.create({
      data: {
        ...payload,
        metadata: payload.metadata as Prisma.InputJsonValue,
      },
    });
  }

  if ((before.currentAddress ?? "") !== (after.currentAddress ?? "")) {
    await createComplianceReportingEvent({
      tenantId,
      workerId,
      eventType: "ADDRESS_CHANGE",
      eventDate: occurred,
      workerName,
      cosReference,
      notes: "Address updated by worker (self-service).",
    });
    await notifyContact("addr", "Address change (self-service)", {
      change: "address",
    });
  }

  if ((before.phone ?? "") !== (after.phone ?? "")) {
    await createComplianceReportingEvent({
      tenantId,
      workerId,
      eventType: "PHONE_CHANGE",
      eventDate: occurred,
      workerName,
      cosReference,
      notes: "Phone updated by worker (self-service).",
    });
    await notifyContact("phone", "Phone change (self-service)", {
      change: "phone",
    });
  }

  if ((before.personalEmail ?? "") !== (after.personalEmail ?? "")) {
    await createComplianceReportingEvent({
      tenantId,
      workerId,
      eventType: "EMAIL_CHANGE",
      eventDate: occurred,
      workerName,
      cosReference,
      notes: "Personal email updated by worker (self-service).",
    });
    await notifyContact("pemail", "Personal email change (self-service)", {
      change: "personal_email",
    });
  }

  if (
    (before.emergencyContact ?? "") !== (after.emergencyContact ?? "") ||
    (before.emergencyPhone ?? "") !== (after.emergencyPhone ?? "")
  ) {
    await notifyContact("emergency", "Emergency contact updated (self-service)", {
      change: "emergency_contact",
    });
  }
}
