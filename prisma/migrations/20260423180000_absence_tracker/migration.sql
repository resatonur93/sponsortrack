-- CreateEnum
CREATE TYPE "AbsenceStatus" AS ENUM (
  'ACTIVE',
  'RETURNED',
  'TERMINATED',
  'CONVERTED_TO_LEAVE'
);

-- New absence type set (replace legacy AUTHORISED → ANNUAL_LEAVE)
CREATE TYPE "AbsenceType_new" AS ENUM (
  'SICK',
  'ANNUAL_LEAVE',
  'UNAUTHORISED',
  'SUSPENDED',
  'MATERNITY_PATERNITY',
  'OTHER'
);

-- AlterTable
ALTER TABLE "AbsenceRecord" ADD COLUMN "status" "AbsenceStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "AbsenceRecord" ADD COLUMN "reason" TEXT;
ALTER TABLE "AbsenceRecord" ADD COLUMN "contactAttempts" JSONB;
ALTER TABLE "AbsenceRecord" ADD COLUMN "returnToWorkDate" TIMESTAMP(3);
ALTER TABLE "AbsenceRecord" ADD COLUMN "returnToWorkNotes" TEXT;
ALTER TABLE "AbsenceRecord" ADD COLUMN "isReportable" BOOLEAN NOT NULL DEFAULT false;

-- Migrate free-text log into structured JSON (before dropping column)
UPDATE "AbsenceRecord"
SET "contactAttempts" = jsonb_build_array(
  jsonb_build_object(
    'date', to_char("createdAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD'),
    'method', 'note',
    'result', "contactAttemptsLog"
  )
)
WHERE "contactAttemptsLog" IS NOT NULL AND trim("contactAttemptsLog") <> '';

UPDATE "AbsenceRecord"
SET "contactAttempts" = '[]'::jsonb
WHERE "contactAttempts" IS NULL;

-- Switch enum on absenceType → type
ALTER TABLE "AbsenceRecord" ALTER COLUMN "absenceType" DROP DEFAULT;
ALTER TABLE "AbsenceRecord" ALTER COLUMN "absenceType" TYPE "AbsenceType_new" USING (
  CASE "absenceType"::text
    WHEN 'AUTHORISED' THEN 'ANNUAL_LEAVE'::"AbsenceType_new"
    WHEN 'SICK' THEN 'SICK'::"AbsenceType_new"
    WHEN 'UNAUTHORISED' THEN 'UNAUTHORISED'::"AbsenceType_new"
    ELSE 'OTHER'::"AbsenceType_new"
  END
);

ALTER TABLE "AbsenceRecord" RENAME COLUMN "absenceType" TO "type";

ALTER TYPE "AbsenceType" RENAME TO "AbsenceType_old";
ALTER TYPE "AbsenceType_new" RENAME TO "AbsenceType";
DROP TYPE "AbsenceType_old";

ALTER TABLE "AbsenceRecord" ALTER COLUMN "type" SET DEFAULT 'UNAUTHORISED'::"AbsenceType";

-- Align isAuthorised with type
UPDATE "AbsenceRecord" SET "isAuthorised" = false WHERE "type" = 'UNAUTHORISED'::"AbsenceType";
UPDATE "AbsenceRecord" SET "isAuthorised" = true WHERE "type" <> 'UNAUTHORISED'::"AbsenceType";

-- Drop legacy columns
ALTER TABLE "AbsenceRecord" DROP COLUMN "contactAttemptsLog";
ALTER TABLE "AbsenceRecord" DROP COLUMN "createdByUserId";

-- CreateIndex
CREATE INDEX "AbsenceRecord_isReportable_idx" ON "AbsenceRecord"("isReportable");
