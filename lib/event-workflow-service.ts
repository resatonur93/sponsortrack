import type { ComplianceEvent } from "@prisma/client";
import {
  EventStatus,
  WorkflowStepStatus,
  WorkflowStepType as WType,
} from "@prisma/client";
import { prismaBase, prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/api-context";
import { getActivePendingStep } from "@/lib/event-workflow-ui";

type Db = typeof prisma;

export { getActivePendingStep, workflowStateLabel } from "@/lib/event-workflow-ui";

async function resolveAssignees(
  tenantId: string,
  input: {
    managerUserId?: string | null;
    complianceUserId?: string | null;
    aoUserId?: string | null;
  }
): Promise<{ managerId: string; complianceId: string; aoId: string }> {
  const firstL1 = await prismaBase.user.findFirst({
    where: { tenantId, isActive: true, role: "LEVEL_1_USER" },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  const secondL1 = firstL1
    ? await prismaBase.user.findFirst({
        where: {
          tenantId,
          isActive: true,
          role: "LEVEL_1_USER",
          id: { not: firstL1.id },
        },
        orderBy: { createdAt: "asc" },
        select: { id: true },
      })
    : null;
  const ao = await prismaBase.user.findFirst({
    where: { tenantId, isActive: true, role: "AUTHORISING_OFFICER" },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  const managerId =
    input.managerUserId?.trim() || firstL1?.id || secondL1?.id || ao?.id;
  if (!managerId) {
    throw new Error("No manager assignee available");
  }
  const complianceId =
    input.complianceUserId?.trim() ||
    secondL1?.id ||
    firstL1?.id ||
    managerId;
  const aoId = input.aoUserId?.trim() || ao?.id || managerId;
  return { managerId, complianceId, aoId };
}

async function assertUserInTenant(
  tenantId: string,
  userId: string
): Promise<void> {
  const u = await prismaBase.user.findFirst({
    where: { id: userId, tenantId, isActive: true },
  });
  if (!u) throw new Error("Assignee not found in tenant");
}

export async function submitEventWorkflow(
  db: Db,
  user: SessionUser,
  eventId: string,
  body: {
    managerUserId?: string | null;
    complianceUserId?: string | null;
    aoUserId?: string | null;
    notes?: string | null;
  }
): Promise<ComplianceEvent> {
  if (user.role !== "LEVEL_1_USER" && user.role !== "AUTHORISING_OFFICER") {
    throw new Error("Only HR-level users can submit");
  }

  const event = await db.complianceEvent.findFirst({ where: { id: eventId } });
  if (!event) throw new Error("Not found");
  if (event.workflowState !== "DRAFT") {
    throw new Error("Event is not in DRAFT state");
  }
  if (
    event.status === EventStatus.CANCELLED ||
    event.status === EventStatus.REPORTED
  ) {
    throw new Error("Invalid event status for submit");
  }

  const assignees = await resolveAssignees(user.tenantId, body);
  await assertUserInTenant(user.tenantId, assignees.managerId);
  await assertUserInTenant(user.tenantId, assignees.complianceId);
  await assertUserInTenant(user.tenantId, assignees.aoId);

  const now = new Date();

  await db.$transaction(async (tx) => {
    await tx.workflowStep.createMany({
      data: [
        {
          eventId,
          tenantId: user.tenantId,
          step: WType.HR_SUBMISSION,
          status: WorkflowStepStatus.APPROVED,
          assignedTo: user.id,
          actionedBy: user.id,
          actionedAt: now,
          notes: body.notes ?? undefined,
        },
        {
          eventId,
          tenantId: user.tenantId,
          step: WType.MANAGER_REVIEW,
          status: WorkflowStepStatus.PENDING,
          assignedTo: assignees.managerId,
        },
      ],
    });

    await tx.complianceEvent.update({
      where: { id: eventId },
      data: {
        workflowState: "SUBMITTED",
        status: EventStatus.UNDER_REVIEW,
      },
    });
  });

  const updated = await db.complianceEvent.findFirst({
    where: { id: eventId },
    include: {
      worker: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          cosReference: true,
        },
      },
      workflowSteps: {
        orderBy: { createdAt: "asc" },
        include: {
          assignee: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          actionedByUser: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      },
    },
  });
  if (!updated) throw new Error("Not found");
  return updated;
}

export async function managerReviewApprove(
  db: Db,
  user: SessionUser,
  eventId: string,
  body: { notes?: string | null }
): Promise<ComplianceEvent> {
  if (user.role !== "LEVEL_1_USER") {
    throw new Error("Manager review requires Level 1 user");
  }

  const event = await db.complianceEvent.findFirst({
    where: { id: eventId },
    include: { workflowSteps: true },
  });
  if (!event) throw new Error("Not found");
  if (event.workflowState !== "SUBMITTED") {
    throw new Error("Event is not awaiting manager review");
  }

  const pending = getActivePendingStep(event.workflowSteps);
  if (!pending || pending.step !== WType.MANAGER_REVIEW) {
    throw new Error("No pending manager step");
  }
  if (pending.assignedTo !== user.id) {
    throw new Error("You are not assigned to this review step");
  }

  const assignees = await resolveAssignees(user.tenantId, {});
  let complianceAssignee = assignees.complianceId;
  if (complianceAssignee === user.id) {
    complianceAssignee = assignees.managerId === user.id ? assignees.aoId : assignees.managerId;
  }
  await assertUserInTenant(user.tenantId, complianceAssignee);

  const now = new Date();

  await db.$transaction(async (tx) => {
    await tx.workflowStep.update({
      where: { id: pending.id },
      data: {
        status: WorkflowStepStatus.APPROVED,
        actionedBy: user.id,
        actionedAt: now,
        notes: body.notes ?? undefined,
      },
    });
    await tx.workflowStep.create({
      data: {
        eventId,
        tenantId: user.tenantId,
        step: WType.COMPLIANCE_REVIEW,
        status: WorkflowStepStatus.PENDING,
        assignedTo: complianceAssignee,
      },
    });
    await tx.complianceEvent.update({
      where: { id: eventId },
      data: { workflowState: "COMPLIANCE_REVIEW" },
    });
  });

  const updated = await db.complianceEvent.findFirst({
    where: { id: eventId },
    include: {
      worker: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          cosReference: true,
        },
      },
      workflowSteps: {
        orderBy: { createdAt: "asc" },
        include: {
          assignee: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          actionedByUser: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      },
    },
  });
  if (!updated) throw new Error("Not found");
  return updated;
}

export async function complianceReviewApprove(
  db: Db,
  user: SessionUser,
  eventId: string,
  body: { notes?: string | null }
): Promise<ComplianceEvent> {
  if (user.role !== "LEVEL_1_USER") {
    throw new Error("Compliance review requires Level 1 user");
  }

  const event = await db.complianceEvent.findFirst({
    where: { id: eventId },
    include: { workflowSteps: true },
  });
  if (!event) throw new Error("Not found");
  if (event.workflowState !== "COMPLIANCE_REVIEW") {
    throw new Error("Event is not in compliance review");
  }

  const pending = getActivePendingStep(event.workflowSteps);
  if (!pending || pending.step !== WType.COMPLIANCE_REVIEW) {
    throw new Error("No pending compliance step");
  }
  if (pending.assignedTo !== user.id) {
    throw new Error("You are not assigned to this compliance step");
  }

  const assignees = await resolveAssignees(user.tenantId, {});
  await assertUserInTenant(user.tenantId, assignees.aoId);

  const now = new Date();

  await db.$transaction(async (tx) => {
    await tx.workflowStep.update({
      where: { id: pending.id },
      data: {
        status: WorkflowStepStatus.APPROVED,
        actionedBy: user.id,
        actionedAt: now,
        notes: body.notes ?? undefined,
      },
    });
    await tx.workflowStep.create({
      data: {
        eventId,
        tenantId: user.tenantId,
        step: WType.AO_APPROVAL,
        status: WorkflowStepStatus.PENDING,
        assignedTo: assignees.aoId,
      },
    });
    await tx.complianceEvent.update({
      where: { id: eventId },
      data: { workflowState: "AO_APPROVAL" },
    });
  });

  const updated = await db.complianceEvent.findFirst({
    where: { id: eventId },
    include: {
      worker: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          cosReference: true,
        },
      },
      workflowSteps: {
        orderBy: { createdAt: "asc" },
        include: {
          assignee: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          actionedByUser: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      },
    },
  });
  if (!updated) throw new Error("Not found");
  return updated;
}

export async function authorisingOfficerApprove(
  db: Db,
  user: SessionUser,
  eventId: string,
  body: { notes?: string | null }
): Promise<ComplianceEvent> {
  if (user.role !== "AUTHORISING_OFFICER") {
    throw new Error("Authorising Officer role required");
  }

  const event = await db.complianceEvent.findFirst({
    where: { id: eventId },
    include: { workflowSteps: true },
  });
  if (!event) throw new Error("Not found");
  if (event.workflowState !== "AO_APPROVAL") {
    throw new Error("Event is not awaiting AO approval");
  }
  if (
    event.status === EventStatus.CANCELLED ||
    event.status === EventStatus.REPORTED
  ) {
    throw new Error("Invalid event status");
  }

  const pending = getActivePendingStep(event.workflowSteps);
  if (!pending || pending.step !== WType.AO_APPROVAL) {
    throw new Error("No pending AO step");
  }
  if (pending.assignedTo !== user.id) {
    throw new Error("You are not assigned as Authorising Officer for this step");
  }

  const now = new Date();

  await db.$transaction(async (tx) => {
    await tx.workflowStep.update({
      where: { id: pending.id },
      data: {
        status: WorkflowStepStatus.APPROVED,
        actionedBy: user.id,
        actionedAt: now,
        notes: body.notes ?? undefined,
      },
    });
    await tx.workflowStep.create({
      data: {
        eventId,
        tenantId: user.tenantId,
        step: WType.FINAL_REPORT,
        status: WorkflowStepStatus.APPROVED,
        assignedTo: user.id,
        actionedBy: user.id,
        actionedAt: now,
        notes: "Workflow complete — ready for HO reporting",
      },
    });
    await tx.complianceEvent.update({
      where: { id: eventId },
      data: {
        workflowState: "REPORTED",
        status: EventStatus.APPROVED,
        approvedBy: user.id,
      },
    });
  });

  const updated = await db.complianceEvent.findFirst({
    where: { id: eventId },
    include: {
      worker: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          cosReference: true,
        },
      },
      workflowSteps: {
        orderBy: { createdAt: "asc" },
        include: {
          assignee: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          actionedByUser: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      },
    },
  });
  if (!updated) throw new Error("Not found");
  return updated;
}

export async function rejectEventWorkflow(
  db: Db,
  user: SessionUser,
  eventId: string,
  body: { notes?: string | null }
): Promise<ComplianceEvent> {
  const event = await db.complianceEvent.findFirst({
    where: { id: eventId },
    include: { workflowSteps: true },
  });
  if (!event) throw new Error("Not found");
  if (event.workflowState === "DRAFT" || event.workflowState === "REPORTED") {
    throw new Error("Cannot reject from this state");
  }

  const pending = getActivePendingStep(event.workflowSteps);
  if (!pending) throw new Error("No active step to reject");

  const canReject =
    pending.assignedTo === user.id ||
    user.role === "AUTHORISING_OFFICER" ||
    user.role === "LEVEL_1_USER";
  if (!canReject) throw new Error("Not allowed to reject this workflow");

  const now = new Date();

  await db.$transaction(async (tx) => {
    await tx.workflowStep.update({
      where: { id: pending.id },
      data: {
        status: WorkflowStepStatus.REJECTED,
        actionedBy: user.id,
        actionedAt: now,
        notes: body.notes ?? undefined,
      },
    });
    await tx.workflowStep.deleteMany({ where: { eventId } });
    await tx.complianceEvent.update({
      where: { id: eventId },
      data: {
        workflowState: "DRAFT",
        status: EventStatus.PENDING,
        approvedBy: null,
      },
    });
  });

  const updated = await db.complianceEvent.findFirst({
    where: { id: eventId },
    include: {
      worker: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          cosReference: true,
        },
      },
      workflowSteps: {
        orderBy: { createdAt: "asc" },
        include: {
          assignee: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          actionedByUser: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      },
    },
  });
  if (!updated) throw new Error("Not found");
  return updated;
}

export async function escalateEventWorkflow(
  db: Db,
  user: SessionUser,
  eventId: string,
  body: { assignToUserId: string; notes?: string | null }
): Promise<ComplianceEvent> {
  const event = await db.complianceEvent.findFirst({
    where: { id: eventId },
    include: { workflowSteps: true },
  });
  if (!event) throw new Error("Not found");
  if (event.workflowState === "DRAFT" || event.workflowState === "REPORTED") {
    throw new Error("Cannot escalate from this state");
  }

  const pending = getActivePendingStep(event.workflowSteps);
  if (!pending) throw new Error("No active step to escalate");

  if (
    pending.assignedTo !== user.id &&
    user.role !== "AUTHORISING_OFFICER"
  ) {
    throw new Error("Not allowed to escalate");
  }

  await assertUserInTenant(user.tenantId, body.assignToUserId.trim());

  const now = new Date();

  await db.$transaction(async (tx) => {
    await tx.workflowStep.update({
      where: { id: pending.id },
      data: {
        status: WorkflowStepStatus.ESCALATED,
        actionedBy: user.id,
        actionedAt: now,
        notes: body.notes ?? undefined,
      },
    });
    await tx.workflowStep.create({
      data: {
        eventId,
        tenantId: user.tenantId,
        step: pending.step,
        status: WorkflowStepStatus.PENDING,
        assignedTo: body.assignToUserId.trim(),
      },
    });
  });

  const updated = await db.complianceEvent.findFirst({
    where: { id: eventId },
    include: {
      worker: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          cosReference: true,
        },
      },
      workflowSteps: {
        orderBy: { createdAt: "asc" },
        include: {
          assignee: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          actionedByUser: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      },
    },
  });
  if (!updated) throw new Error("Not found");
  return updated;
}

