-- CreateEnum
CREATE TYPE "EventType" AS ENUM (
  'NO_SHOW_28_DAYS',
  'UNAUTHORISED_ABSENCE_10_DAYS',
  'REDUCED_PAY_ABSENCE',
  'SALARY_REDUCTION',
  'ROLE_CHANGE',
  'PROMOTION_SAME_CODE',
  'WORK_LOCATION_CHANGE',
  'SPONSORSHIP_ENDED',
  'OFFSHORE_ARRIVAL',
  'OFFSHORE_DEPARTURE',
  'ADDRESS_CHANGE',
  'PHONE_CHANGE',
  'EMAIL_CHANGE'
);

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM (
  'PENDING',
  'UNDER_REVIEW',
  'APPROVED',
  'REPORTED',
  'OVERDUE',
  'CANCELLED'
);

-- CreateTable
CREATE TABLE "ComplianceEvent" (
    "id" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "eventType" "EventType" NOT NULL,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "reportDeadline" TIMESTAMP(3) NOT NULL,
    "status" "EventStatus" NOT NULL DEFAULT 'PENDING',
    "evidenceRequired" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "smsDraft" TEXT,
    "approvedBy" TEXT,
    "reportedDate" TIMESTAMP(3),
    "notes" TEXT,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComplianceEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ComplianceEvent_status_reportDeadline_idx" ON "ComplianceEvent"("status", "reportDeadline");

-- CreateIndex
CREATE INDEX "ComplianceEvent_workerId_idx" ON "ComplianceEvent"("workerId");

-- CreateIndex
CREATE INDEX "ComplianceEvent_tenantId_idx" ON "ComplianceEvent"("tenantId");

-- AddForeignKey
ALTER TABLE "ComplianceEvent" ADD CONSTRAINT "ComplianceEvent_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceEvent" ADD CONSTRAINT "ComplianceEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
