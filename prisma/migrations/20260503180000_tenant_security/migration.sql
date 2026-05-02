-- CreateTable
CREATE TABLE "TenantSecuritySettings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "enforceIpWhitelist" BOOLEAN NOT NULL DEFAULT false,
    "sessionIdleTimeoutMinutes" INTEGER,
    "sessionAbsoluteMaxMinutes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantSecuritySettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AllowedIpRule" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "cidr" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AllowedIpRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAuthSession" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userAgent" TEXT,
    "deviceLabel" TEXT,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "UserAuthSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserTrustedDevice" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "trusted" BOOLEAN NOT NULL DEFAULT false,
    "lastIp" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trustedAt" TIMESTAMP(3),

    CONSTRAINT "UserTrustedDevice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TenantSecuritySettings_tenantId_key" ON "TenantSecuritySettings"("tenantId");

-- CreateIndex
CREATE INDEX "TenantSecuritySettings_tenantId_idx" ON "TenantSecuritySettings"("tenantId");

-- CreateIndex
CREATE INDEX "AllowedIpRule_tenantId_sortOrder_idx" ON "AllowedIpRule"("tenantId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "UserAuthSession_sessionToken_key" ON "UserAuthSession"("sessionToken");

-- CreateIndex
CREATE INDEX "UserAuthSession_tenantId_userId_revokedAt_idx" ON "UserAuthSession"("tenantId", "userId", "revokedAt");

-- CreateIndex
CREATE INDEX "UserAuthSession_lastSeenAt_idx" ON "UserAuthSession"("lastSeenAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserTrustedDevice_userId_fingerprint_key" ON "UserTrustedDevice"("userId", "fingerprint");

-- CreateIndex
CREATE INDEX "UserTrustedDevice_tenantId_idx" ON "UserTrustedDevice"("tenantId");

-- AddForeignKey
ALTER TABLE "TenantSecuritySettings" ADD CONSTRAINT "TenantSecuritySettings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AllowedIpRule" ADD CONSTRAINT "AllowedIpRule_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAuthSession" ADD CONSTRAINT "UserAuthSession_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAuthSession" ADD CONSTRAINT "UserAuthSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTrustedDevice" ADD CONSTRAINT "UserTrustedDevice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTrustedDevice" ADD CONSTRAINT "UserTrustedDevice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
