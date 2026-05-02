-- AlterTable
ALTER TABLE "NotificationEvent" ADD COLUMN "readAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "NotificationEvent_tenantId_readAt_idx" ON "NotificationEvent"("tenantId", "readAt");
