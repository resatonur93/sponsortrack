import { DocumentFolder, type DocumentType } from "@prisma/client";

/**
 * Maps a vault folder to the primary `DocumentType` used for Appendix D checklist slots.
 * Folders without a clear matrix mapping return null (sync skipped).
 */
export function mapFolderToDocumentType(folder: DocumentFolder): DocumentType | null {
  switch (folder) {
    case DocumentFolder.IDENTITY_IMMIGRATION:
      return "PASSPORT";
    case DocumentFolder.RIGHT_TO_WORK:
      return "RIGHT_TO_WORK";
    case DocumentFolder.COS_APPLICATION:
      return "COS";
    case DocumentFolder.EMPLOYMENT_CONTRACT:
      return "EMPLOYMENT_CONTRACT";
    case DocumentFolder.PAYROLL_SALARY:
      return "PAYSLIP_PAYMENT_PROOF";
    case DocumentFolder.ADDRESS_CONTACT:
      return "CONTACT_DETAILS_RECORD";
    case DocumentFolder.RECRUITMENT_VACANCY:
      return "RECRUITMENT_FILE";
    case DocumentFolder.ABSENCE_LEAVE:
    case DocumentFolder.ROLE_DUTIES:
    case DocumentFolder.ROLE_ORG_CHART:
    case DocumentFolder.REPORTING_SUBMISSIONS:
    case DocumentFolder.COMPLIANCE_VISIT_PACK:
    case DocumentFolder.OTHER:
      return null;
  }
}
