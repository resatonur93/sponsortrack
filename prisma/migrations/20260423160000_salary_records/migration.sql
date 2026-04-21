-- CreateTable
CREATE TABLE "SalaryRecord" (
    "id" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "contractedSalary" INTEGER NOT NULL,
    "actualPaid" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "hoursWorked" INTEGER,
    "overtime" INTEGER,
    "deductions" JSONB,
    "isCompliant" BOOLEAN NOT NULL,
    "discrepancyReason" TEXT,
    "evidenceUrl" TEXT,
    "approvedBy" TEXT,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalaryRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SalaryRecord_workerId_idx" ON "SalaryRecord"("workerId");

-- CreateIndex
CREATE INDEX "SalaryRecord_tenantId_idx" ON "SalaryRecord"("tenantId");

-- CreateIndex
CREATE INDEX "SalaryRecord_periodEnd_idx" ON "SalaryRecord"("periodEnd");

-- CreateIndex
CREATE INDEX "SalaryRecord_isCompliant_idx" ON "SalaryRecord"("isCompliant");

-- CreateIndex
CREATE INDEX "SalaryRecord_tenantId_isCompliant_idx" ON "SalaryRecord"("tenantId", "isCompliant");

-- AddForeignKey
ALTER TABLE "SalaryRecord" ADD CONSTRAINT "SalaryRecord_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalaryRecord" ADD CONSTRAINT "SalaryRecord_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
