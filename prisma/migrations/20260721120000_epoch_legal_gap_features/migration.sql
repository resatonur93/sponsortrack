-- CreateEnum
CREATE TYPE "SupplementaryEmploymentStatus" AS ENUM ('ACTIVE', 'ENDED');

-- CreateEnum
CREATE TYPE "VacancyStatus" AS ENUM ('DRAFT', 'UNDER_REVIEW', 'APPROVED', 'CONVERTED', 'REJECTED', 'CLOSED');

-- AlterTable
ALTER TABLE "NotificationConfig" ADD COLUMN     "externalAdviserEmail" TEXT,
ADD COLUMN     "externalAdviserName" TEXT;

-- AlterTable
ALTER TABLE "ComplianceEvent" ADD COLUMN     "escalatedAt" TIMESTAMP(3),
ADD COLUMN     "escalatedByUserId" TEXT,
ADD COLUMN     "escalationNote" TEXT;

-- CreateTable
CREATE TABLE "SupplementaryEmployment" (
    "id" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "employerName" TEXT NOT NULL,
    "occupationCode" TEXT NOT NULL,
    "isSameOccupation" BOOLEAN NOT NULL DEFAULT true,
    "isShortageOccupation" BOOLEAN NOT NULL DEFAULT false,
    "hoursPerWeek" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "status" "SupplementaryEmploymentStatus" NOT NULL DEFAULT 'ACTIVE',
    "flags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupplementaryEmployment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vacancy" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "jobTitle" TEXT NOT NULL,
    "occupationCode" TEXT NOT NULL,
    "proposedSalary" INTEGER NOT NULL,
    "hoursPerWeek" INTEGER,
    "workLocation" TEXT NOT NULL,
    "jobDescription" TEXT NOT NULL,
    "genuineVacancyChecklist" JSONB,
    "genuineVacancyNotes" TEXT,
    "status" "VacancyStatus" NOT NULL DEFAULT 'DRAFT',
    "createdByUserId" TEXT NOT NULL,
    "convertedWorkerId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vacancy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SupplementaryEmployment_workerId_idx" ON "SupplementaryEmployment"("workerId");

-- CreateIndex
CREATE INDEX "SupplementaryEmployment_tenantId_idx" ON "SupplementaryEmployment"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Vacancy_convertedWorkerId_key" ON "Vacancy"("convertedWorkerId");

-- CreateIndex
CREATE INDEX "Vacancy_tenantId_idx" ON "Vacancy"("tenantId");

-- CreateIndex
CREATE INDEX "Vacancy_status_idx" ON "Vacancy"("status");

-- AddForeignKey
ALTER TABLE "SupplementaryEmployment" ADD CONSTRAINT "SupplementaryEmployment_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vacancy" ADD CONSTRAINT "Vacancy_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vacancy" ADD CONSTRAINT "Vacancy_convertedWorkerId_fkey" FOREIGN KEY ("convertedWorkerId") REFERENCES "Worker"("id") ON DELETE SET NULL ON UPDATE CASCADE;

