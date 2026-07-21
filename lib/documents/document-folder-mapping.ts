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

/**
 * Reverse of `mapFolderToDocumentType`, plus a few document types that have no
 * dedicated vault folder (fall back to OTHER). Used to deep-link "upload now"
 * actions from the Appendix D checklist to the right vault folder.
 */
const DOCUMENT_TYPE_TO_FOLDER: Partial<Record<DocumentType, DocumentFolder>> = {
  PASSPORT: DocumentFolder.IDENTITY_IMMIGRATION,
  EVISA: DocumentFolder.IDENTITY_IMMIGRATION,
  VISA: DocumentFolder.IDENTITY_IMMIGRATION,
  BRP: DocumentFolder.IDENTITY_IMMIGRATION,
  SHARE_CODE: DocumentFolder.RIGHT_TO_WORK,
  RIGHT_TO_WORK: DocumentFolder.RIGHT_TO_WORK,
  COS: DocumentFolder.COS_APPLICATION,
  EMPLOYMENT_CONTRACT: DocumentFolder.EMPLOYMENT_CONTRACT,
  PAYSLIP_PAYMENT_PROOF: DocumentFolder.PAYROLL_SALARY,
  CONTACT_DETAILS_RECORD: DocumentFolder.ADDRESS_CONTACT,
  PROOF_OF_ADDRESS: DocumentFolder.ADDRESS_CONTACT,
  RECRUITMENT_FILE: DocumentFolder.RECRUITMENT_VACANCY,
  ATAS_CERTIFICATE: DocumentFolder.OTHER,
  VESSEL_ASSIGNMENT_LETTER: DocumentFolder.OTHER,
  NMC_REGISTRATION: DocumentFolder.OTHER,
  DBS_CHECK: DocumentFolder.OTHER,
  QUALIFICATION: DocumentFolder.OTHER,
  PROFESSIONAL_REGISTRATION: DocumentFolder.OTHER,
};

/** First matching folder among the accepted document types; OTHER if none map. */
export function folderForDocumentTypes(accepted: DocumentType[]): DocumentFolder {
  for (const type of accepted) {
    const folder = DOCUMENT_TYPE_TO_FOLDER[type];
    if (folder) return folder;
  }
  return DocumentFolder.OTHER;
}
