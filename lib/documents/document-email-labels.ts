import type { DocumentType, DocumentFolder } from "@prisma/client";

const TYPE_TR: Record<DocumentType, string> = {
  PASSPORT: "Pasaport",
  BRP: "BRP / oturum belgesi",
  EVISA: "e-Vize",
  SHARE_CODE: "Paylaşım kodu kanıtı",
  VISA: "Vize",
  COS: "Sponsorluk sertifikası (CoS)",
  ATAS_CERTIFICATE: "ATAS sertifikası",
  DBS_CHECK: "DBS kontrolü",
  EMPLOYMENT_CONTRACT: "İş sözleşmesi",
  QUALIFICATION: "Mesleki yeterlilik",
  PROFESSIONAL_REGISTRATION: "Meslek kaydı",
  RIGHT_TO_WORK: "Çalışma hakkı kanıtı",
  PROOF_OF_ADDRESS: "Adres kanıtı",
  NMC_REGISTRATION: "NMC kaydı",
  VESSEL_ASSIGNMENT_LETTER: "Görevlendirme mektubu (gemi)",
  PAYSLIP_PAYMENT_PROOF: "Bordro / ödeme kanıtı",
  CONTACT_DETAILS_RECORD: "İletişim bilgileri kaydı",
  RECRUITMENT_FILE: "İşe alım dosyası (CV / ilan / mülakat)",
};

const TYPE_EN: Record<DocumentType, string> = {
  PASSPORT: "Passport",
  BRP: "BRP / immigration status",
  EVISA: "eVisa",
  SHARE_CODE: "Share code evidence",
  VISA: "Visa",
  COS: "Certificate of Sponsorship (CoS)",
  ATAS_CERTIFICATE: "ATAS certificate",
  DBS_CHECK: "DBS check",
  EMPLOYMENT_CONTRACT: "Employment contract",
  QUALIFICATION: "Qualification",
  PROFESSIONAL_REGISTRATION: "Professional registration",
  RIGHT_TO_WORK: "Right to work evidence",
  PROOF_OF_ADDRESS: "Proof of address",
  NMC_REGISTRATION: "NMC registration",
  VESSEL_ASSIGNMENT_LETTER: "Vessel assignment letter",
  PAYSLIP_PAYMENT_PROOF: "Payslip / payment evidence",
  CONTACT_DETAILS_RECORD: "Contact details record",
  RECRUITMENT_FILE: "Recruitment file (CV / advert / interview)",
};

const FOLDER_TR: Record<DocumentFolder, string> = {
  IDENTITY_IMMIGRATION: "Kimlik / göç",
  RIGHT_TO_WORK: "Çalışma hakkı",
  COS_APPLICATION: "CoS / başvuru",
  EMPLOYMENT_CONTRACT: "İş sözleşmesi",
  PAYROLL_SALARY: "Bordro / maaş",
  ABSENCE_LEAVE: "İzin / devamsızlık",
  ADDRESS_CONTACT: "Adres / iletişim",
  ROLE_DUTIES: "Rol / görevler",
  ROLE_ORG_CHART: "Rol / org şeması",
  RECRUITMENT_VACANCY: "İşe alım",
  REPORTING_SUBMISSIONS: "Raporlama",
  COMPLIANCE_VISIT_PACK: "Uyum ziyaret paketi",
  OTHER: "Diğer",
};

const FOLDER_EN: Record<DocumentFolder, string> = {
  IDENTITY_IMMIGRATION: "Identity & Immigration",
  RIGHT_TO_WORK: "Right to work",
  COS_APPLICATION: "CoS & application",
  EMPLOYMENT_CONTRACT: "Employment contract",
  PAYROLL_SALARY: "Payroll / salary",
  ABSENCE_LEAVE: "Absence & leave",
  ADDRESS_CONTACT: "Address / contact",
  ROLE_DUTIES: "Role / duties",
  ROLE_ORG_CHART: "Role / org chart",
  RECRUITMENT_VACANCY: "Recruitment",
  REPORTING_SUBMISSIONS: "Reporting",
  COMPLIANCE_VISIT_PACK: "Compliance visit pack",
  OTHER: "Other",
};

export function documentTypeTitleTr(dt: DocumentType): string {
  return TYPE_TR[dt] ?? dt;
}

export function documentTypeTitleEn(dt: DocumentType): string {
  return TYPE_EN[dt] ?? dt;
}

export function formatDocumentHumanSummary(
  documentType: DocumentType,
  vaultFolder: DocumentFolder
): string {
  const typeTr = TYPE_TR[documentType] ?? documentType;
  const typeEn = TYPE_EN[documentType] ?? documentType;
  const vfTr = FOLDER_TR[vaultFolder] ?? vaultFolder;
  const vfEn = FOLDER_EN[vaultFolder] ?? vaultFolder;
  return [
    `Belge / Document: ${typeTr} / ${typeEn}`,
    `Kod / Code: ${documentType}`,
    `Klasör / Vault folder: ${vfTr} / ${vfEn} (${vaultFolder})`,
  ].join("\n");
}
