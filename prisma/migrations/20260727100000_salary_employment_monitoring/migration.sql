-- AlterEnum
ALTER TYPE "AbsenceType" ADD VALUE 'UNPAID_LEAVE';

-- AlterTable
ALTER TABLE "Worker" ADD COLUMN     "contractedHoursPerWeek" INTEGER;

-- AlterTable
ALTER TABLE "SalaryRecord" ADD COLUMN     "belowCosThreshold" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hoursDiscrepancy" BOOLEAN NOT NULL DEFAULT false;
