-- Policy Hub: sponsor guidance & training acknowledgements

CREATE TYPE "PolicyCategory" AS ENUM (
    'SPONSOR_DUTIES',
    'IMMIGRATION_RULES',
    'COMPLIANCE_GUIDANCE',
    'DATA_PROTECTION',
    'EMPLOYMENT_LAW',
    'TRAINING_MATERIAL'
);

CREATE TABLE "Policy" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "category" "PolicyCategory" NOT NULL,
    "isAcknowledgementRequired" BOOLEAN NOT NULL DEFAULT false,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Policy_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Acknowledgement" (
    "id" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "acknowledgedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenantId" TEXT NOT NULL,

    CONSTRAINT "Acknowledgement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Policy_tenantId_idx" ON "Policy"("tenantId");
CREATE INDEX "Policy_category_idx" ON "Policy"("category");
CREATE INDEX "Acknowledgement_tenantId_idx" ON "Acknowledgement"("tenantId");
CREATE INDEX "Acknowledgement_userId_idx" ON "Acknowledgement"("userId");

CREATE UNIQUE INDEX "Acknowledgement_policyId_userId_key" ON "Acknowledgement"("policyId", "userId");

ALTER TABLE "Policy" ADD CONSTRAINT "Policy_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Acknowledgement" ADD CONSTRAINT "Acknowledgement_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "Policy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Acknowledgement" ADD CONSTRAINT "Acknowledgement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Acknowledgement" ADD CONSTRAINT "Acknowledgement_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
