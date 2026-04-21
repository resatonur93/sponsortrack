-- UK Law Compliance checks (NMW, working time, holiday, contract flags)

CREATE TABLE "UkLawCheck" (
    "id" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "nmwCompliant" BOOLEAN,
    "hourlyRate" DECIMAL(12,4),
    "hoursPerWeek" DECIMAL(10,2),
    "weeklyHours" DECIMAL(10,2),
    "maxWeeklyHours" DECIMAL(10,2) NOT NULL DEFAULT 48,
    "optOutSigned" BOOLEAN NOT NULL DEFAULT false,
    "annualEntitlement" DECIMAL(10,2) NOT NULL DEFAULT 28,
    "daysTaken" DECIMAL(10,2),
    "daysRemaining" DECIMAL(10,2),
    "contractIssued" TIMESTAMP(3),
    "contractType" TEXT NOT NULL DEFAULT 'permanent',
    "flags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UkLawCheck_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UkLawCheck_workerId_key" ON "UkLawCheck"("workerId");

CREATE INDEX "UkLawCheck_tenantId_idx" ON "UkLawCheck"("tenantId");

ALTER TABLE "UkLawCheck" ADD CONSTRAINT "UkLawCheck_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UkLawCheck" ADD CONSTRAINT "UkLawCheck_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
