-- AlterTable
ALTER TABLE "Worker" ADD COLUMN     "applicableSalaryThreshold" INTEGER;

-- AlterTable
ALTER TABLE "SalaryRecord" ADD COLUMN     "belowApplicableThreshold" BOOLEAN NOT NULL DEFAULT false;
