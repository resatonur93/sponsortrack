-- CreateEnum
CREATE TYPE "OrgChangeType" AS ENUM (
  'COMPANY_SIZE_CHANGE',
  'CHARITY_STATUS_CHANGE',
  'KEY_PERSONNEL_CHANGE',
  'BRANCH_OPEN_CLOSE',
  'MERGER',
  'TAKEOVER',
  'TUPE_TRANSFER',
  'RESTRUCTURING',
  'INSOLVENCY',
  'ADMINISTRATION',
  'LIQUIDATION',
  'CVA',
  'ADDRESS_CHANGE',
  'NAME_CHANGE'
);

-- New lifecycle enum (replace OPEN/REPORTED/CLOSED)
CREATE TYPE "OrgChangeStatus_new" AS ENUM (
  'PENDING',
  'IN_PROGRESS',
  'COMPLETED',
  'REPORTED',
  'OVERDUE'
);

-- AlterTable: new columns
ALTER TABLE "OrganisationChange" ADD COLUMN "changeType" "OrgChangeType";
UPDATE "OrganisationChange" SET "changeType" = 'RESTRUCTURING' WHERE "changeType" IS NULL;
ALTER TABLE "OrganisationChange" ALTER COLUMN "changeType" SET NOT NULL;

ALTER TABLE "OrganisationChange" ADD COLUMN "effectiveDate" TIMESTAMP(3);
UPDATE "OrganisationChange" SET "effectiveDate" = COALESCE("occurredAt", "createdAt");
ALTER TABLE "OrganisationChange" ALTER COLUMN "effectiveDate" SET NOT NULL;

ALTER TABLE "OrganisationChange" ADD COLUMN "hoReportDeadline" TIMESTAMP(3);
UPDATE "OrganisationChange" SET "hoReportDeadline" = COALESCE("reportDeadlineAt", "createdAt" + interval '28 days');
ALTER TABLE "OrganisationChange" ALTER COLUMN "hoReportDeadline" SET NOT NULL;

ALTER TABLE "OrganisationChange" ADD COLUMN "reportedToHO" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "OrganisationChange" ADD COLUMN "hoReportDate" TIMESTAMP(3);
ALTER TABLE "OrganisationChange" ADD COLUMN "evidenceDocuments" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "OrganisationChange" ADD COLUMN "approvedBy" TEXT;
ALTER TABLE "OrganisationChange" ADD COLUMN "notes" TEXT;

-- Merge title into description (description becomes required)
UPDATE "OrganisationChange" SET "description" = CASE
  WHEN "description" IS NOT NULL AND trim("description") <> '' THEN "title" || E'\n\n' || "description"
  ELSE "title"
END;
ALTER TABLE "OrganisationChange" ALTER COLUMN "description" SET NOT NULL;

-- Status enum swap
ALTER TABLE "OrganisationChange" ADD COLUMN "status_new" "OrgChangeStatus_new" NOT NULL DEFAULT 'PENDING';
UPDATE "OrganisationChange" SET "status_new" = CASE "status"::text
  WHEN 'OPEN' THEN 'PENDING'::"OrgChangeStatus_new"
  WHEN 'REPORTED' THEN 'REPORTED'::"OrgChangeStatus_new"
  WHEN 'CLOSED' THEN 'COMPLETED'::"OrgChangeStatus_new"
  ELSE 'PENDING'::"OrgChangeStatus_new"
END;
ALTER TABLE "OrganisationChange" DROP COLUMN "status";
ALTER TYPE "OrgChangeStatus" RENAME TO "OrgChangeStatus_old";
ALTER TYPE "OrgChangeStatus_new" RENAME TO "OrgChangeStatus";
ALTER TABLE "OrganisationChange" RENAME COLUMN "status_new" TO "status";
ALTER TABLE "OrganisationChange" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "OrganisationChange" ALTER COLUMN "status" SET DEFAULT 'PENDING'::"OrgChangeStatus";
DROP TYPE "OrgChangeStatus_old";

-- Drop legacy columns
ALTER TABLE "OrganisationChange" DROP COLUMN "title";
ALTER TABLE "OrganisationChange" DROP COLUMN "occurredAt";
ALTER TABLE "OrganisationChange" DROP COLUMN "reportDeadlineAt";
ALTER TABLE "OrganisationChange" DROP COLUMN "updatedAt";

-- CreateIndex
CREATE INDEX "OrganisationChange_status_idx" ON "OrganisationChange"("status");
CREATE INDEX "OrganisationChange_hoReportDeadline_idx" ON "OrganisationChange"("hoReportDeadline");
