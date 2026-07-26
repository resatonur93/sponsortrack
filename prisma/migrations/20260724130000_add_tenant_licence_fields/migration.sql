-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "licenceExpiryDate" TIMESTAMP(3),
ADD COLUMN     "licenceRating" TEXT,
ADD COLUMN     "licenceType" TEXT;
