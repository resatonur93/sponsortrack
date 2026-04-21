import type { EventWorkflowState, WorkflowStepType } from "@prisma/client";
import { WorkflowStepStatus, WorkflowStepType as WType } from "@prisma/client";

const STEP_ORDER: WorkflowStepType[] = [
  WType.HR_SUBMISSION,
  WType.MANAGER_REVIEW,
  WType.COMPLIANCE_REVIEW,
  WType.AO_APPROVAL,
  WType.FINAL_REPORT,
];

function stepRank(t: WorkflowStepType): number {
  return STEP_ORDER.indexOf(t);
}

/** Safe for client bundles — no Prisma / Node-only imports. */
export function getActivePendingStep<
  T extends { step: WorkflowStepType; status: WorkflowStepStatus },
>(steps: T[]): T | undefined {
  const active = steps.filter(
    (s) =>
      s.status === WorkflowStepStatus.PENDING ||
      s.status === WorkflowStepStatus.IN_PROGRESS
  );
  active.sort((a, b) => stepRank(a.step) - stepRank(b.step));
  return active[0];
}

export function workflowStateLabel(s: EventWorkflowState): string {
  const labels: Record<EventWorkflowState, string> = {
    DRAFT: "Draft",
    SUBMITTED: "Submitted (manager)",
    MANAGER_REVIEW: "Manager review",
    COMPLIANCE_REVIEW: "Compliance",
    AO_APPROVAL: "AO approval",
    REPORTED: "Approved (workflow)",
  };
  return labels[s] ?? s;
}
