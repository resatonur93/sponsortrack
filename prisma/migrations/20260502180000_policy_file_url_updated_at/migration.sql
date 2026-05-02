-- Policy: optional attachment URL + row updates for auditing
ALTER TABLE "Policy" ADD COLUMN "fileUrl" TEXT;
ALTER TABLE "Policy" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
