-- Link Document (Appendix D checklist) ↔ DocumentVault (physical file) and enforce one active row per (tenant, worker, documentType).

-- 1) Compliance record status (upload vs verified)
CREATE TYPE "DocumentComplianceRecordStatus" AS ENUM ('UPLOADED', 'VERIFIED');

ALTER TABLE "Document" ADD COLUMN "compliance_record_status" "DocumentComplianceRecordStatus" NOT NULL DEFAULT 'UPLOADED';

UPDATE "Document"
SET "compliance_record_status" = 'VERIFIED'
WHERE "verifiedAt" IS NOT NULL;

-- 2) De-duplicate active rows so a partial unique index can be applied.
--    Repoint version chains that referenced a duplicate we are about to retire.
WITH ranked AS (
  SELECT
    "id",
    FIRST_VALUE("id") OVER (
      PARTITION BY "tenantId", "workerId", "documentType"
      ORDER BY
        CASE WHEN "verifiedAt" IS NULL THEN 0 ELSE 1 END DESC,
        "uploadDate" DESC,
        "version" DESC,
        "id" DESC
    ) AS keeper_id,
    ROW_NUMBER() OVER (
      PARTITION BY "tenantId", "workerId", "documentType"
      ORDER BY
        CASE WHEN "verifiedAt" IS NULL THEN 0 ELSE 1 END DESC,
        "uploadDate" DESC,
        "version" DESC,
        "id" DESC
    ) AS rn
  FROM "Document"
  WHERE "isDeleted" = false
),
losers AS (SELECT id, keeper_id FROM ranked WHERE rn > 1 AND id <> keeper_id)
UPDATE "Document" child
SET "replacesDocumentId" = losers.keeper_id
FROM losers
WHERE child."replacesDocumentId" = losers.id;

WITH ranked AS (
  SELECT
    "id",
    FIRST_VALUE("id") OVER (
      PARTITION BY "tenantId", "workerId", "documentType"
      ORDER BY
        CASE WHEN "verifiedAt" IS NULL THEN 0 ELSE 1 END DESC,
        "uploadDate" DESC,
        "version" DESC,
        "id" DESC
    ) AS keeper_id,
    ROW_NUMBER() OVER (
      PARTITION BY "tenantId", "workerId", "documentType"
      ORDER BY
        CASE WHEN "verifiedAt" IS NULL THEN 0 ELSE 1 END DESC,
        "uploadDate" DESC,
        "version" DESC,
        "id" DESC
    ) AS rn
  FROM "Document"
  WHERE "isDeleted" = false
),
losers AS (SELECT id, keeper_id FROM ranked WHERE rn > 1 AND id <> keeper_id)
UPDATE "Document" d
SET
  "isDeleted" = true,
  "deletedAt" = CURRENT_TIMESTAMP,
  "deletedReason" = 'MIGRATION_DEDUPLICATE_COMPLIANCE_SLOT'
FROM losers
WHERE d.id = losers.id;

-- 3) Vault pointer on the compliance row (single FK; inverse is Prisma-only)
ALTER TABLE "Document" ADD COLUMN "vault_file_id" TEXT;

CREATE UNIQUE INDEX "Document_vault_file_id_key" ON "Document"("vault_file_id");

ALTER TABLE "Document" ADD CONSTRAINT "Document_vault_file_id_fkey" FOREIGN KEY ("vault_file_id") REFERENCES "DocumentVault"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 4) At most one non-deleted row per compliance slot (allows multiple soft-deleted history rows)
CREATE UNIQUE INDEX "Document_active_tenant_worker_documentType_uidx"
ON "Document" ("tenantId", "workerId", "documentType")
WHERE ("isDeleted" = false);
