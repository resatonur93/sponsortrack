-- Idempotent SMTP log for visa / RTW / sponsorship / CoS compliance reminder mails

CREATE TYPE "NotificationComplianceAnchorDomain" AS ENUM (
  'VISA_EXPIRY',
  'RIGHT_TO_WORK_RECHECK',
  'SPONSORSHIP_END',
  'COS_EXPIRY'
);

CREATE TABLE "NotificationEmailLog" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "workerId" TEXT NOT NULL,
  "notificationEventId" TEXT,
  "anchorDomain" "NotificationComplianceAnchorDomain" NOT NULL,
  "anchorDay" TEXT NOT NULL,
  "reminderKind" "DocumentExpiryReminderKind" NOT NULL,
  "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "NotificationEmailLog_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "NotificationEmailLog_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "NotificationEmailLog_workerId_anchorDomain_anchorDay_reminderKind_key"
    UNIQUE ("workerId", "anchorDomain", "anchorDay", "reminderKind")
);

CREATE INDEX "NotificationEmailLog_tenantId_idx" ON "NotificationEmailLog"("tenantId");

CREATE INDEX "NotificationEmailLog_notificationEventId_idx" ON "NotificationEmailLog"("notificationEventId");
