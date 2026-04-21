-- CreateTable
CREATE TABLE "SmsReportDraft" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "smsText" TEXT NOT NULL,
    "evidenceChecklist" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "deadline" TIMESTAMP(3) NOT NULL,
    "internalNotes" TEXT,
    "generatedBy" TEXT NOT NULL,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "sentToHO" BOOLEAN NOT NULL DEFAULT false,
    "sentAt" TIMESTAMP(3),
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SmsReportDraft_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SmsReportDraft_tenantId_idx" ON "SmsReportDraft"("tenantId");

-- CreateIndex
CREATE INDEX "SmsReportDraft_eventId_idx" ON "SmsReportDraft"("eventId");

-- CreateIndex
CREATE INDEX "SmsReportDraft_createdAt_idx" ON "SmsReportDraft"("createdAt");

-- AddForeignKey
ALTER TABLE "SmsReportDraft" ADD CONSTRAINT "SmsReportDraft_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "ComplianceEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmsReportDraft" ADD CONSTRAINT "SmsReportDraft_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
