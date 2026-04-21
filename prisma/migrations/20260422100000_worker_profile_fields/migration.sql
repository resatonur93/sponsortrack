-- AlterTable
ALTER TABLE "Worker" ADD COLUMN     "lineManagerId" TEXT,
ADD COLUMN     "currentAddress" TEXT,
ADD COLUMN     "emergencyContact" TEXT,
ADD COLUMN     "emergencyPhone" TEXT;

-- CreateIndex
CREATE INDEX "Worker_lineManagerId_idx" ON "Worker"("lineManagerId");

-- AddForeignKey
ALTER TABLE "Worker" ADD CONSTRAINT "Worker_lineManagerId_fkey" FOREIGN KEY ("lineManagerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
