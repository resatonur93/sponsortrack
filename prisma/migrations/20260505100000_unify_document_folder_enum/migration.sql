-- Unify DocumentFolder and DocumentVaultFolder into a single DocumentFolder enum.
--
-- DocumentVaultFolder had two extra values (ROLE_ORG_CHART, OTHER) not in DocumentFolder.
-- DocumentFolder has ROLE_DUTIES which DocumentVaultFolder lacked (mapped to ROLE_ORG_CHART
-- in application code via mapDocumentFolderToVaultFolder — that function is now removed).
--
-- Steps:
--   1. Add ROLE_ORG_CHART and OTHER to DocumentFolder.
--   2. Cast Document.vaultFolder from DocumentVaultFolder → DocumentFolder (text pivot, safe).
--   3. Drop the now-redundant DocumentVaultFolder enum.

-- Step 1: extend DocumentFolder with the two missing values
ALTER TYPE "DocumentFolder" ADD VALUE IF NOT EXISTS 'ROLE_ORG_CHART';
ALTER TYPE "DocumentFolder" ADD VALUE IF NOT EXISTS 'OTHER';

-- Step 2: re-type the Document.vaultFolder column
-- All DocumentVaultFolder values exist verbatim in the updated DocumentFolder enum,
-- so a ::text::"DocumentFolder" cast is safe.
ALTER TABLE "Document"
  ALTER COLUMN "vaultFolder" TYPE "DocumentFolder"
  USING "vaultFolder"::text::"DocumentFolder";

-- Step 3: remove the now-redundant enum
DROP TYPE "DocumentVaultFolder";
