DROP INDEX IF EXISTS "DocumentExpiryEmailLog_documentId_expiryDay_key";

CREATE TYPE "DocumentExpiryReminderKind" AS ENUM ('BEFORE_30', 'BEFORE_7', 'EXPIRY_DAY', 'AFTER_EXPIRED');

ALTER TABLE "DocumentExpiryEmailLog" ADD COLUMN "kind" "DocumentExpiryReminderKind" NOT NULL DEFAULT 'AFTER_EXPIRED';

CREATE UNIQUE INDEX "DocumentExpiryEmailLog_documentId_expiryDay_kind_key" ON "DocumentExpiryEmailLog"("documentId", "expiryDay", "kind");
