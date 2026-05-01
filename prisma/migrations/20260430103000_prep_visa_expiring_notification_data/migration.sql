-- Move rows off VISA_EXPIRING_90_DAYS before any migration or db push drops that label.
-- Prisma enum replacement fails if existing rows still reference the removed variant.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_enum e
    INNER JOIN pg_catalog.pg_type t ON e.enumtypid = t.oid
    INNER JOIN pg_catalog.pg_namespace n ON t.typnamespace = n.oid
    WHERE n.nspname = 'public'
      AND t.typname = 'NotificationType'
      AND e.enumlabel = 'VISA_EXPIRING_60_DAYS'
  ) THEN
    EXECUTE 'ALTER TYPE "NotificationType" ADD VALUE ''VISA_EXPIRING_60_DAYS''';
  END IF;
END $$;

UPDATE "NotificationEvent"
SET "eventType" = 'VISA_EXPIRING_60_DAYS'::"NotificationType"
WHERE "eventType"::text = 'VISA_EXPIRING_90_DAYS';
