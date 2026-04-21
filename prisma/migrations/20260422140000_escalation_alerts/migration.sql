-- CreateEnum
CREATE TYPE "AlertType" AS ENUM (
  'DEADLINE_APPROACHING',
  'DEADLINE_OVERDUE',
  'MISSING_DOCUMENT',
  'SALARY_MISMATCH',
  'VISA_EXPIRING',
  'ROLE_CODE_MISMATCH',
  'UNEXPLAINED_ABSENCE',
  'ORG_CHANGE_PENDING'
);

-- CreateEnum
CREATE TYPE "AlertLevel" AS ENUM (
  'LOW',
  'MEDIUM',
  'HIGH',
  'CRITICAL'
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "workerId" TEXT,
    "alertType" "AlertType" NOT NULL,
    "level" "AlertLevel" NOT NULL,
    "message" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "dismissedAt" TIMESTAMP(3),
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Alert_tenantId_dedupeKey_key" ON "Alert"("tenantId", "dedupeKey");

-- CreateIndex
CREATE INDEX "Alert_tenantId_level_isRead_idx" ON "Alert"("tenantId", "level", "isRead");

-- CreateIndex
CREATE INDEX "Alert_workerId_idx" ON "Alert"("workerId");

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
