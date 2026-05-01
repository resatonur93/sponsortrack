import {
  DocumentFolder,
  DocumentVaultFolder,
  type DocumentType,
} from "@prisma/client";

/**
 * Maps a vault folder to the primary `DocumentType` used for Appendix D checklist slots.
 * Folders without a clear matrix mapping return null (sync skipped).
 */
export function mapFolderToDocumentType(folder: DocumentFolder): DocumentType | null {
  switch (folder) {
    case DocumentFolder.IDENTITY_IMMIGRATION:
      // Slot accepts PASSPORT | EVISA | VISA | BRP — default to PASSPORT as primary key.
      return "PASSPORT";
    case DocumentFolder.RIGHT_TO_WORK:
      // Slot accepts SHARE_CODE | RIGHT_TO_WORK.
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
    case DocumentFolder.REPORTING_SUBMISSIONS:
    case DocumentFolder.COMPLIANCE_VISIT_PACK:
      return null;
  }
}

/**
 * `Document` rows use `DocumentVaultFolder`, which is a superset of vault `DocumentFolder` names.
 */
export function mapDocumentFolderToVaultFolder(folder: DocumentFolder): DocumentVaultFolder {
  if (folder === DocumentFolder.ROLE_DUTIES) {
    return DocumentVaultFolder.ROLE_ORG_CHART;
  }
  return folder as unknown as DocumentVaultFolder;
}
