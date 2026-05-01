-- Appendix D-aligned document checklist types (UK sponsor compliance packs)

DO $$
BEGIN
  ALTER TYPE "DocumentType" ADD VALUE 'PAYSLIP_PAYMENT_PROOF';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE "DocumentType" ADD VALUE 'CONTACT_DETAILS_RECORD';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE "DocumentType" ADD VALUE 'RECRUITMENT_FILE';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
