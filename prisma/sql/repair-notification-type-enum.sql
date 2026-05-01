-- Idempotent repair before `prisma db push` removes VISA_EXPIRING_90_DAYS.
-- Updates every public.Base table column typed as NotificationType (not only NotificationEvent).
-- Production should prefer `prisma migrate deploy` (see migrations/20260430103000_*).

DO $$
DECLARE
  typ_exists boolean;
  has_old_label boolean;
  r record;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_type t
    INNER JOIN pg_catalog.pg_namespace n ON t.typnamespace = n.oid
    WHERE n.nspname = 'public' AND t.typname = 'NotificationType'
  ) INTO typ_exists;

  IF NOT typ_exists THEN
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_enum e
    INNER JOIN pg_catalog.pg_type t ON e.enumtypid = t.oid
    INNER JOIN pg_catalog.pg_namespace n ON t.typnamespace = n.oid
    WHERE n.nspname = 'public'
      AND t.typname = 'NotificationType'
      AND e.enumlabel = 'VISA_EXPIRING_90_DAYS'
  ) INTO has_old_label;

  IF NOT has_old_label THEN
    RETURN;
  END IF;

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

  FOR r IN
    SELECT
      n.nspname AS sch,
      c.relname AS tbl,
      a.attname AS col
    FROM pg_catalog.pg_attribute a
    INNER JOIN pg_catalog.pg_class c ON c.oid = a.attrelid
    INNER JOIN pg_catalog.pg_type t ON t.oid = a.atttypid
    INNER JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind IN ('r', 'p')
      AND NOT a.attisdropped
      AND a.attnum > 0
      AND t.typname = 'NotificationType'
  LOOP
    EXECUTE format(
      'UPDATE %I.%I SET %I = ''VISA_EXPIRING_60_DAYS''::"NotificationType" WHERE %I::text = ''VISA_EXPIRING_90_DAYS''',
      r.sch,
      r.tbl,
      r.col,
      r.col
    );
  END LOOP;
END $$ LANGUAGE plpgsql;
