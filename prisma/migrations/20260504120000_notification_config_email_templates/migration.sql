-- CreateTable
CREATE TABLE "NotificationConfig" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "ccRecipients" TEXT,
    "bccRecipients" TEXT,
    "sendAfterExpired" BOOLEAN NOT NULL DEFAULT true,
    "visaRemind60Enabled" BOOLEAN NOT NULL DEFAULT true,
    "visaRemind60Days" INTEGER NOT NULL DEFAULT 60,
    "visaRemind30Enabled" BOOLEAN NOT NULL DEFAULT true,
    "visaRemind30Days" INTEGER NOT NULL DEFAULT 30,
    "visaRemind7Enabled" BOOLEAN NOT NULL DEFAULT true,
    "visaRemind7Days" INTEGER NOT NULL DEFAULT 7,
    "visaRemindLastDayEnabled" BOOLEAN NOT NULL DEFAULT true,
    "sponsorshipRemind60Enabled" BOOLEAN NOT NULL DEFAULT true,
    "sponsorshipRemind60Days" INTEGER NOT NULL DEFAULT 60,
    "sponsorshipRemind30Enabled" BOOLEAN NOT NULL DEFAULT true,
    "sponsorshipRemind30Days" INTEGER NOT NULL DEFAULT 30,
    "sponsorshipRemind7Enabled" BOOLEAN NOT NULL DEFAULT true,
    "sponsorshipRemind7Days" INTEGER NOT NULL DEFAULT 7,
    "sponsorshipRemindLastDayEnabled" BOOLEAN NOT NULL DEFAULT false,
    "rtwRemind60Enabled" BOOLEAN NOT NULL DEFAULT true,
    "rtwRemind60Days" INTEGER NOT NULL DEFAULT 60,
    "rtwRemind30Enabled" BOOLEAN NOT NULL DEFAULT true,
    "rtwRemind30Days" INTEGER NOT NULL DEFAULT 30,
    "rtwRemind7Enabled" BOOLEAN NOT NULL DEFAULT true,
    "rtwRemind7Days" INTEGER NOT NULL DEFAULT 7,
    "rtwRemindLastDayEnabled" BOOLEAN NOT NULL DEFAULT false,
    "documentRemind60Enabled" BOOLEAN NOT NULL DEFAULT true,
    "documentRemind60Days" INTEGER NOT NULL DEFAULT 60,
    "documentRemind30Enabled" BOOLEAN NOT NULL DEFAULT true,
    "documentRemind30Days" INTEGER NOT NULL DEFAULT 30,
    "documentRemind7Enabled" BOOLEAN NOT NULL DEFAULT true,
    "documentRemind7Days" INTEGER NOT NULL DEFAULT 7,
    "documentRemindLastDayEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailTemplate" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "templateKey" TEXT NOT NULL,
    "subjectTr" TEXT NOT NULL,
    "subjectEn" TEXT NOT NULL,
    "bodyTr" TEXT NOT NULL,
    "bodyEn" TEXT NOT NULL,
    "variableHints" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NotificationConfig_tenantId_key" ON "NotificationConfig"("tenantId");

-- CreateIndex
CREATE INDEX "NotificationConfig_tenantId_idx" ON "NotificationConfig"("tenantId");

-- CreateIndex
CREATE INDEX "EmailTemplate_tenantId_idx" ON "EmailTemplate"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "EmailTemplate_tenantId_templateKey_key" ON "EmailTemplate"("tenantId", "templateKey");

-- AddForeignKey
ALTER TABLE "NotificationConfig" ADD CONSTRAINT "NotificationConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailTemplate" ADD CONSTRAINT "EmailTemplate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
