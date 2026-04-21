-- CreateEnum
CREATE TYPE "EventWorkflowState" AS ENUM (
  'DRAFT',
  'SUBMITTED',
  'MANAGER_REVIEW',
  'COMPLIANCE_REVIEW',
  'AO_APPROVAL',
  'REPORTED'
);

-- CreateEnum
CREATE TYPE "WorkflowStepType" AS ENUM (
  'HR_SUBMISSION',
  'MANAGER_REVIEW',
  'COMPLIANCE_REVIEW',
  'AO_APPROVAL',
  'FINAL_REPORT'
);

-- CreateEnum
CREATE TYPE "WorkflowStepStatus" AS ENUM (
  'PENDING',
  'IN_PROGRESS',
  'APPROVED',
  'REJECTED',
  'ESCALATED'
);

-- AlterTable
ALTER TABLE "ComplianceEvent" ADD COLUMN "workflowState" "EventWorkflowState" NOT NULL DEFAULT 'DRAFT';

UPDATE "ComplianceEvent" SET "workflowState" = 'REPORTED' WHERE status = 'REPORTED';
UPDATE "ComplianceEvent" SET "workflowState" = 'AO_APPROVAL' WHERE status = 'APPROVED';
UPDATE "ComplianceEvent" SET "workflowState" = 'DRAFT' WHERE status IN ('PENDING', 'UNDER_REVIEW', 'OVERDUE');

-- CreateIndex
CREATE INDEX "ComplianceEvent_workflowState_idx" ON "ComplianceEvent"("workflowState");

-- CreateTable
CREATE TABLE "WorkflowStep" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "step" "WorkflowStepType" NOT NULL,
    "status" "WorkflowStepStatus" NOT NULL DEFAULT 'PENDING',
    "assignedTo" TEXT NOT NULL,
    "actionedBy" TEXT,
    "actionedAt" TIMESTAMP(3),
    "notes" TEXT,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkflowStep_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkflowStep_tenantId_idx" ON "WorkflowStep"("tenantId");

-- CreateIndex
CREATE INDEX "WorkflowStep_eventId_idx" ON "WorkflowStep"("eventId");

-- CreateIndex
CREATE INDEX "WorkflowStep_assignedTo_idx" ON "WorkflowStep"("assignedTo");

-- CreateIndex
CREATE INDEX "WorkflowStep_status_idx" ON "WorkflowStep"("status");

-- AddForeignKey
ALTER TABLE "WorkflowStep" ADD CONSTRAINT "WorkflowStep_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "ComplianceEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowStep" ADD CONSTRAINT "WorkflowStep_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowStep" ADD CONSTRAINT "WorkflowStep_actionedBy_fkey" FOREIGN KEY ("actionedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowStep" ADD CONSTRAINT "WorkflowStep_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
