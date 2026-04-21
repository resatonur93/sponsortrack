-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateTable
CREATE TABLE "RiskScore" (
    "id" TEXT NOT NULL,
    "workerId" TEXT,
    "tenantId" TEXT NOT NULL,
    "isTenantAggregate" BOOLEAN NOT NULL DEFAULT false,
    "score" INTEGER NOT NULL,
    "level" "RiskLevel" NOT NULL,
    "factors" JSONB NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RiskScore_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RiskScore_tenantId_idx" ON "RiskScore"("tenantId");

-- CreateIndex
CREATE INDEX "RiskScore_tenantId_level_idx" ON "RiskScore"("tenantId", "level");

-- CreateIndex
CREATE INDEX "RiskScore_tenantId_isTenantAggregate_idx" ON "RiskScore"("tenantId", "isTenantAggregate");

-- CreateIndex
CREATE INDEX "RiskScore_workerId_idx" ON "RiskScore"("workerId");

-- AddForeignKey
ALTER TABLE "RiskScore" ADD CONSTRAINT "RiskScore_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskScore" ADD CONSTRAINT "RiskScore_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
