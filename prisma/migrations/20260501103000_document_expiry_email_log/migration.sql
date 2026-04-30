-- CreateTable
CREATE TABLE "DocumentExpiryEmailLog" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "expiryDay" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentExpiryEmailLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DocumentExpiryEmailLog_documentId_expiryDay_key" ON "DocumentExpiryEmailLog"("documentId", "expiryDay");

-- CreateIndex
CREATE INDEX "DocumentExpiryEmailLog_tenantId_idx" ON "DocumentExpiryEmailLog"("tenantId");

-- AddForeignKey
ALTER TABLE "DocumentExpiryEmailLog" ADD CONSTRAINT "DocumentExpiryEmailLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
