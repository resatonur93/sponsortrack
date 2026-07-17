-- CreateEnum
CREATE TYPE "LoginAttemptScope" AS ENUM ('TENANT_USER', 'SELF_SERVICE_WORKER');

-- CreateTable
CREATE TABLE "LoginAttempt" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "scope" "LoginAttemptScope" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LoginAttempt_email_scope_createdAt_idx" ON "LoginAttempt"("email", "scope", "createdAt");

-- CreateIndex
CREATE INDEX "LoginAttempt_ip_scope_createdAt_idx" ON "LoginAttempt"("ip", "scope", "createdAt");
