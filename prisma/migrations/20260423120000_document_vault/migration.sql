-- CreateEnum
CREATE TYPE "DocumentFolder" AS ENUM (
  'IDENTITY_IMMIGRATION',
  'RIGHT_TO_WORK',
  'COS_APPLICATION',
  'EMPLOYMENT_CONTRACT',
  'PAYROLL_SALARY',
  'ABSENCE_LEAVE',
  'ADDRESS_CONTACT',
  'ROLE_DUTIES',
  'RECRUITMENT_VACANCY',
  'REPORTING_SUBMISSIONS',
  'COMPLIANCE_VISIT_PACK'
);

-- CreateTable
CREATE TABLE "DocumentVault" (
    "id" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "folder" "DocumentFolder" NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileData" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "previousVersions" JSONB,
    "uploadedBy" TEXT NOT NULL,
    "expiryDate" TIMESTAMP(3),
    "retentionUntil" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentVault_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DocumentVault_workerId_idx" ON "DocumentVault"("workerId");

-- CreateIndex
CREATE INDEX "DocumentVault_tenantId_idx" ON "DocumentVault"("tenantId");

-- CreateIndex
CREATE INDEX "DocumentVault_folder_idx" ON "DocumentVault"("folder");

-- CreateIndex
CREATE INDEX "DocumentVault_isDeleted_idx" ON "DocumentVault"("isDeleted");

-- AddForeignKey
ALTER TABLE "DocumentVault" ADD CONSTRAINT "DocumentVault_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentVault" ADD CONSTRAINT "DocumentVault_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
