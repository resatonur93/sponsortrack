-- Repair partial deploys: column was renamed to "type" while Prisma expects "absenceType" (@map).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'AbsenceRecord'
      AND column_name = 'type'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'AbsenceRecord'
      AND column_name = 'absenceType'
  ) THEN
    ALTER TABLE "AbsenceRecord" RENAME COLUMN "type" TO "absenceType";
  END IF;
END $$;
