-- CreateEnum
CREATE TYPE "Role" AS ENUM ('AUTHORISING_OFFICER', 'LEVEL_1_USER', 'LEVEL_2_USER');

-- CreateEnum
CREATE TYPE "ComplianceRiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "EmploymentStatus" AS ENUM ('PENDING_START', 'ACTIVE', 'SUSPENDED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('NO_SHOW', 'UNAUTHORISED_ABSENCE', 'UNPAID_OR_REDUCED_PAY_ABSENCE', 'SALARY_REDUCTION', 'CHANGE_OF_ROLE_OR_DUTIES', 'PROMOTION_SAME_SOC', 'WORK_LOCATION_CHANGE', 'SPONSORSHIP_ENDED', 'OFFSHORE_ARRIVAL', 'OFFSHORE_DEPARTURE', 'ORGANISATION_CHANGE', 'ADDRESS_CONTACT_UPDATE', 'ORGANISATION_SIZE_CHANGE', 'CHARITY_STATUS_CHANGE', 'KEY_PERSONNEL_CHANGE', 'MERGER_TUPE_RESTRUCTURING', 'INSOLVENCY_RELATED', 'VISA_EXPIRING_90_DAYS', 'VISA_EXPIRING_30_DAYS', 'VISA_EXPIRING_7_DAYS', 'DOCUMENT_EXPIRING', 'WORKER_MISSING_DOCUMENTS', 'SALARY_DISCREPANCY');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'COMPLETED', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DocumentVaultFolder" AS ENUM ('IDENTITY_IMMIGRATION', 'RIGHT_TO_WORK', 'COS_APPLICATION', 'EMPLOYMENT_CONTRACT', 'PAYROLL_SALARY', 'ABSENCE_LEAVE', 'ADDRESS_CONTACT', 'ROLE_ORG_CHART', 'RECRUITMENT_VACANCY', 'REPORTING_SUBMISSIONS', 'COMPLIANCE_VISIT_PACK', 'OTHER');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('PASSPORT', 'BRP', 'EVISA', 'SHARE_CODE', 'VISA', 'COS', 'ATAS_CERTIFICATE', 'DBS_CHECK', 'EMPLOYMENT_CONTRACT', 'QUALIFICATION', 'PROFESSIONAL_REGISTRATION', 'RIGHT_TO_WORK', 'PROOF_OF_ADDRESS', 'NMC_REGISTRATION', 'VESSEL_ASSIGNMENT_LETTER');

-- CreateEnum
CREATE TYPE "RtwCheckMethod" AS ENUM ('ONLINE_SHARE_CODE', 'MANUAL_DOCUMENT_CHECK', 'EMPLOYER_PORTAL', 'RE_VERIFICATION', 'OTHER');

-- CreateEnum
CREATE TYPE "ChangeCategory" AS ENUM ('ADDRESS', 'PHONE_EMAIL', 'SALARY', 'WORK_LOCATION', 'ROLE_TITLE', 'PROMOTION', 'ABSENCE', 'OTHER');

-- CreateEnum
CREATE TYPE "AbsenceType" AS ENUM ('SICK', 'UNAUTHORISED', 'AUTHORISED');

-- CreateEnum
CREATE TYPE "OrgChangeStatus" AS ENUM ('OPEN', 'REPORTED', 'CLOSED');

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "licenceNumber" TEXT NOT NULL,
    "address" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Worker" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "workPhone" TEXT,
    "personalEmail" TEXT,
    "nationality" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3),
    "passportNumber" TEXT,
    "brpNumber" TEXT,
    "nationalInsuranceNumber" TEXT,
    "visaType" TEXT NOT NULL,
    "cosReference" TEXT NOT NULL,
    "cosAssignDate" TIMESTAMP(3) NOT NULL,
    "cosExpiryDate" TIMESTAMP(3) NOT NULL,
    "visaStartDate" TIMESTAMP(3),
    "visaExpiryDate" TIMESTAMP(3),
    "jobTitle" TEXT NOT NULL,
    "occupationCode" TEXT NOT NULL,
    "jobDescription" TEXT,
    "contractJobDescription" TEXT,
    "actualDayToDayDuties" TEXT,
    "occupationCodeJustification" TEXT,
    "salary" INTEGER NOT NULL,
    "workLocation" TEXT NOT NULL,
    "employmentStatus" "EmploymentStatus" NOT NULL DEFAULT 'PENDING_START',
    "employmentStartDate" TIMESTAMP(3),
    "lineManagerName" TEXT,
    "lineManagerEmail" TEXT,
    "rightToWorkLastCheckedAt" TIMESTAMP(3),
    "isOffshoreWorker" BOOLEAN NOT NULL DEFAULT false,
    "vesselName" TEXT,
    "sponsorshipStartDate" TIMESTAMP(3),
    "sponsorshipEndDate" TIMESTAMP(3),
    "complianceRiskLevel" "ComplianceRiskLevel" NOT NULL DEFAULT 'LOW',
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "requiresAtasCertificate" BOOLEAN NOT NULL DEFAULT false,
    "preRegistrationNurse" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Worker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationEvent" (
    "id" TEXT NOT NULL,
    "eventType" "NotificationType" NOT NULL,
    "workerId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "occurredAt" TIMESTAMP(3),
    "reportDeadlineAt" TIMESTAMP(3),
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "reportedDate" TIMESTAMP(3),
    "notes" TEXT,
    "metadata" JSONB,
    "evidenceRequired" TEXT,
    "smsDraft" TEXT,
    "internalApprovalNote" TEXT,
    "approverRole" "Role",
    "reminderStage" INTEGER NOT NULL DEFAULT 0,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "documentType" "DocumentType" NOT NULL,
    "vaultFolder" "DocumentVaultFolder" NOT NULL DEFAULT 'OTHER',
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileData" TEXT,
    "metadata" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,
    "replacesDocumentId" TEXT,
    "uploadDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiryDate" TIMESTAMP(3),
    "retentionUntil" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "verifiedByUserId" TEXT,
    "verificationNote" TEXT,
    "uploadedBy" TEXT NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "deletedReason" TEXT,
    "complianceEventId" TEXT,
    "tenantId" TEXT NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RightToWorkCheck" (
    "id" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkMethod" "RtwCheckMethod" NOT NULL,
    "outcomeSummary" TEXT,
    "shareCodeUsed" TEXT,
    "notes" TEXT,
    "evidenceDocumentId" TEXT,
    "nextCheckDueAt" TIMESTAMP(3),
    "tenantId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RightToWorkCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkerChangeLog" (
    "id" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "changeCategory" "ChangeCategory" NOT NULL,
    "summary" TEXT NOT NULL,
    "previousValue" TEXT,
    "newValue" TEXT,
    "effectiveDate" TIMESTAMP(3),
    "tenantId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkerChangeLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AbsenceRecord" (
    "id" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "absenceType" "AbsenceType" NOT NULL DEFAULT 'UNAUTHORISED',
    "isAuthorised" BOOLEAN NOT NULL DEFAULT false,
    "consecutiveWorkingDays" INTEGER,
    "notes" TEXT,
    "contactAttemptsLog" TEXT,
    "approvedBy" TEXT,
    "tenantId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AbsenceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalaryHistory" (
    "id" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "oldSalary" INTEGER NOT NULL,
    "newSalary" INTEGER NOT NULL,
    "reason" TEXT,
    "justification" TEXT,
    "approvedBy" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalaryHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganisationChange" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "occurredAt" TIMESTAMP(3),
    "reportDeadlineAt" TIMESTAMP(3),
    "status" "OrgChangeStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganisationChange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "changes" JSONB,
    "performedBy" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_licenceNumber_key" ON "Tenant"("licenceNumber");

-- CreateIndex
CREATE INDEX "User_tenantId_idx" ON "User"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Worker_visaExpiryDate_idx" ON "Worker"("visaExpiryDate");

-- CreateIndex
CREATE INDEX "Worker_employmentStatus_idx" ON "Worker"("employmentStatus");

-- CreateIndex
CREATE INDEX "Worker_tenantId_idx" ON "Worker"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Worker_cosReference_tenantId_key" ON "Worker"("cosReference", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationEvent_idempotencyKey_key" ON "NotificationEvent"("idempotencyKey");

-- CreateIndex
CREATE INDEX "NotificationEvent_status_dueDate_idx" ON "NotificationEvent"("status", "dueDate");

-- CreateIndex
CREATE INDEX "NotificationEvent_reportDeadlineAt_idx" ON "NotificationEvent"("reportDeadlineAt");

-- CreateIndex
CREATE INDEX "NotificationEvent_workerId_eventType_status_idx" ON "NotificationEvent"("workerId", "eventType", "status");

-- CreateIndex
CREATE INDEX "NotificationEvent_tenantId_idx" ON "NotificationEvent"("tenantId");

-- CreateIndex
CREATE INDEX "Document_workerId_idx" ON "Document"("workerId");

-- CreateIndex
CREATE INDEX "Document_retentionUntil_idx" ON "Document"("retentionUntil");

-- CreateIndex
CREATE INDEX "Document_tenantId_idx" ON "Document"("tenantId");

-- CreateIndex
CREATE INDEX "Document_vaultFolder_idx" ON "Document"("vaultFolder");

-- CreateIndex
CREATE INDEX "Document_complianceEventId_idx" ON "Document"("complianceEventId");

-- CreateIndex
CREATE INDEX "RightToWorkCheck_workerId_idx" ON "RightToWorkCheck"("workerId");

-- CreateIndex
CREATE INDEX "RightToWorkCheck_tenantId_idx" ON "RightToWorkCheck"("tenantId");

-- CreateIndex
CREATE INDEX "RightToWorkCheck_checkedAt_idx" ON "RightToWorkCheck"("checkedAt");

-- CreateIndex
CREATE INDEX "WorkerChangeLog_workerId_idx" ON "WorkerChangeLog"("workerId");

-- CreateIndex
CREATE INDEX "WorkerChangeLog_tenantId_idx" ON "WorkerChangeLog"("tenantId");

-- CreateIndex
CREATE INDEX "AbsenceRecord_workerId_idx" ON "AbsenceRecord"("workerId");

-- CreateIndex
CREATE INDEX "AbsenceRecord_tenantId_idx" ON "AbsenceRecord"("tenantId");

-- CreateIndex
CREATE INDEX "SalaryHistory_workerId_idx" ON "SalaryHistory"("workerId");

-- CreateIndex
CREATE INDEX "SalaryHistory_tenantId_idx" ON "SalaryHistory"("tenantId");

-- CreateIndex
CREATE INDEX "SalaryHistory_effectiveDate_idx" ON "SalaryHistory"("effectiveDate");

-- CreateIndex
CREATE INDEX "OrganisationChange_tenantId_idx" ON "OrganisationChange"("tenantId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_createdAt_idx" ON "AuditLog"("tenantId", "createdAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Worker" ADD CONSTRAINT "Worker_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationEvent" ADD CONSTRAINT "NotificationEvent_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationEvent" ADD CONSTRAINT "NotificationEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_replacesDocumentId_fkey" FOREIGN KEY ("replacesDocumentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_complianceEventId_fkey" FOREIGN KEY ("complianceEventId") REFERENCES "NotificationEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RightToWorkCheck" ADD CONSTRAINT "RightToWorkCheck_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkerChangeLog" ADD CONSTRAINT "WorkerChangeLog_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbsenceRecord" ADD CONSTRAINT "AbsenceRecord_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalaryHistory" ADD CONSTRAINT "SalaryHistory_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganisationChange" ADD CONSTRAINT "OrganisationChange_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

