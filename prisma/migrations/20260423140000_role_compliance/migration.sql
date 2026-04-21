-- CreateTable
CREATE TABLE "RoleCompliance" (
    "id" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "cosJobDescription" TEXT NOT NULL,
    "cosOccupationCode" TEXT NOT NULL,
    "contractDuties" TEXT NOT NULL,
    "internalJobDesc" TEXT,
    "actualDuties" TEXT,
    "lastReviewed" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "mismatchFlags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "needsChangeOfEmployment" BOOLEAN NOT NULL DEFAULT false,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoleCompliance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RoleCompliance_workerId_key" ON "RoleCompliance"("workerId");

-- CreateIndex
CREATE INDEX "RoleCompliance_tenantId_idx" ON "RoleCompliance"("tenantId");

-- AddForeignKey
ALTER TABLE "RoleCompliance" ADD CONSTRAINT "RoleCompliance_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleCompliance" ADD CONSTRAINT "RoleCompliance_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
