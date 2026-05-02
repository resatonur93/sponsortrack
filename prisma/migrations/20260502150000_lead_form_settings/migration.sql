-- CreateTable
CREATE TABLE "LeadFormSettings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadFormSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadFormField" (
    "id" TEXT NOT NULL,
    "settingsId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "fieldKey" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "placeholder" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "validation" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadFormField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadFormSourceOption" (
    "id" TEXT NOT NULL,
    "settingsId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "value" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadFormSourceOption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LeadFormSettings_tenantId_key" ON "LeadFormSettings"("tenantId");

-- CreateIndex
CREATE INDEX "LeadFormSettings_tenantId_idx" ON "LeadFormSettings"("tenantId");

-- CreateIndex
CREATE INDEX "LeadFormField_settingsId_sortOrder_idx" ON "LeadFormField"("settingsId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "LeadFormField_settingsId_fieldKey_key" ON "LeadFormField"("settingsId", "fieldKey");

-- CreateIndex
CREATE INDEX "LeadFormSourceOption_settingsId_sortOrder_idx" ON "LeadFormSourceOption"("settingsId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "LeadFormSourceOption_settingsId_value_key" ON "LeadFormSourceOption"("settingsId", "value");

-- AddForeignKey
ALTER TABLE "LeadFormSettings" ADD CONSTRAINT "LeadFormSettings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadFormField" ADD CONSTRAINT "LeadFormField_settingsId_fkey" FOREIGN KEY ("settingsId") REFERENCES "LeadFormSettings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadFormSourceOption" ADD CONSTRAINT "LeadFormSourceOption_settingsId_fkey" FOREIGN KEY ("settingsId") REFERENCES "LeadFormSettings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
