-- CreateTable
CREATE TABLE "LoginOtpChallenge" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginOtpChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LoginOtpChallenge_userId_consumedAt_expiresAt_idx" ON "LoginOtpChallenge"("userId", "consumedAt", "expiresAt");

-- CreateIndex
CREATE INDEX "LoginOtpChallenge_createdAt_idx" ON "LoginOtpChallenge"("createdAt");

-- AddForeignKey
ALTER TABLE "LoginOtpChallenge" ADD CONSTRAINT "LoginOtpChallenge_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoginOtpChallenge" ADD CONSTRAINT "LoginOtpChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
