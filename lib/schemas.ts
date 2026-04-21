import { z } from "zod";
import {
  AbsenceType,
  ChangeCategory,
  ComplianceRiskLevel,
  DocumentFolder,
  DocumentType,
  DocumentVaultFolder,
  EmploymentStatus,
  EventStatus,
  EventType,
  RtwCheckMethod,
} from "@prisma/client";

const employmentStatusSchema = z.nativeEnum(EmploymentStatus);

const dateInput = z
  .string()
  .min(1)
  .refine((s) => !Number.isNaN(Date.parse(s)), "Invalid date");

const optionalDateInput = z.preprocess(
  (v) => (v === "" || v === undefined ? null : v),
  dateInput.nullable().optional()
);

export const workerCreateSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional().nullable(),
  workPhone: z.string().optional().nullable(),
  personalEmail: z.string().optional().nullable(),
  nationality: z.string().min(1),
  dateOfBirth: optionalDateInput,
  passportNumber: z.string().optional().nullable(),
  brpNumber: z.string().optional().nullable(),
  nationalInsuranceNumber: z.string().optional().nullable(),
  visaType: z.string().min(1),
  cosReference: z.string().min(1),
  cosAssignDate: dateInput,
  cosExpiryDate: dateInput,
  visaStartDate: optionalDateInput,
  visaExpiryDate: optionalDateInput,
  jobTitle: z.string().min(1),
  occupationCode: z.string().min(1),
  jobDescription: z.string().optional().nullable(),
  contractJobDescription: z.string().optional().nullable(),
  actualDayToDayDuties: z.string().optional().nullable(),
  occupationCodeJustification: z.string().optional().nullable(),
  salary: z.number().int().nonnegative(),
  workLocation: z.string().min(1),
  employmentStatus: employmentStatusSchema.optional(),
  employmentStartDate: optionalDateInput,
  lineManagerId: z.string().cuid().optional().nullable(),
  lineManagerName: z.string().optional().nullable(),
  lineManagerEmail: z.string().optional().nullable(),
  currentAddress: z.string().optional().nullable(),
  emergencyContact: z.string().optional().nullable(),
  emergencyPhone: z.string().optional().nullable(),
  rightToWorkLastCheckedAt: optionalDateInput,
  isOffshoreWorker: z.boolean().optional(),
  vesselName: z.string().optional().nullable(),
  sponsorshipStartDate: optionalDateInput,
  sponsorshipEndDate: optionalDateInput,
  complianceRiskLevel: z.nativeEnum(ComplianceRiskLevel).optional(),
  requiresAtasCertificate: z.boolean().optional(),
  preRegistrationNurse: z.boolean().optional(),
  salaryReductionJustification: z.string().optional().nullable(),
});

export const workerUpdateSchema = workerCreateSchema.partial();

export const notificationCompleteSchema = z.object({
  notes: z.string().optional(),
});

const notificationTypeEnum = z.enum([
  "NO_SHOW",
  "UNAUTHORISED_ABSENCE",
  "UNPAID_OR_REDUCED_PAY_ABSENCE",
  "SALARY_REDUCTION",
  "CHANGE_OF_ROLE_OR_DUTIES",
  "PROMOTION_SAME_SOC",
  "WORK_LOCATION_CHANGE",
  "SPONSORSHIP_ENDED",
  "OFFSHORE_ARRIVAL",
  "OFFSHORE_DEPARTURE",
  "ORGANISATION_CHANGE",
  "ADDRESS_CONTACT_UPDATE",
  "ORGANISATION_SIZE_CHANGE",
  "CHARITY_STATUS_CHANGE",
  "KEY_PERSONNEL_CHANGE",
  "MERGER_TUPE_RESTRUCTURING",
  "INSOLVENCY_RELATED",
  "VISA_EXPIRING_90_DAYS",
  "VISA_EXPIRING_30_DAYS",
  "VISA_EXPIRING_7_DAYS",
  "DOCUMENT_EXPIRING",
  "WORKER_MISSING_DOCUMENTS",
  "SALARY_DISCREPANCY",
]);

export const manualNotificationSchema = z.object({
  workerId: z.string().min(1),
  eventType: notificationTypeEnum,
  dueDate: dateInput,
  notes: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const documentVerifySchema = z.object({
  verificationNote: z.string().optional().nullable(),
});

export const documentUploadSchema = z.object({
  workerId: z.string().min(1),
  documentType: z.nativeEnum(DocumentType),
  vaultFolder: z.nativeEnum(DocumentVaultFolder).optional(),
  fileName: z.string().min(1),
  fileUrl: z.string().min(1),
  fileData: z.string().optional().nullable(),
  expiryDate: optionalDateInput,
  complianceEventId: z.string().optional().nullable(),
  metadata: z.record(z.unknown()).optional().nullable(),
  replacesDocumentId: z.string().optional().nullable(),
});

export const documentVaultCreateSchema = z.object({
  folder: z.nativeEnum(DocumentFolder),
  fileName: z.string().min(1),
  fileUrl: z.string().min(1),
  fileData: z.string().optional().nullable(),
  expiryDate: optionalDateInput,
});

const optionalIsoDate = z
  .string()
  .optional()
  .refine(
    (s) => s === undefined || s === "" || !Number.isNaN(Date.parse(s)),
    "Invalid date"
  );

export const documentVaultUpdateSchema = z.object({
  fileName: z.string().min(1),
  fileUrl: z.string().min(1),
  fileData: z.string().optional().nullable(),
  /** Omit to leave unchanged; empty string clears */
  expiryDate: optionalIsoDate,
  retentionUntil: optionalIsoDate,
});

export const absenceCreateSchema = z.object({
  startDate: dateInput,
  endDate: optionalDateInput,
  absenceType: z.nativeEnum(AbsenceType).optional(),
  isAuthorised: z.boolean().optional(),
  consecutiveWorkingDays: z.number().int().nonnegative().optional().nullable(),
  notes: z.string().optional().nullable(),
  contactAttemptsLog: z.string().optional().nullable(),
  approvedBy: z.string().optional().nullable(),
});

export const changeLogCreateSchema = z.object({
  changeCategory: z.nativeEnum(ChangeCategory),
  summary: z.string().min(1),
  previousValue: z.string().optional().nullable(),
  newValue: z.string().optional().nullable(),
  effectiveDate: optionalDateInput,
});

export const rtwCheckCreateSchema = z.object({
  checkedAt: optionalDateInput,
  checkMethod: z.nativeEnum(RtwCheckMethod),
  outcomeSummary: z.string().optional().nullable(),
  shareCodeUsed: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  evidenceDocumentId: z.string().optional().nullable(),
  nextCheckDueAt: optionalDateInput,
});

export const organisationChangeSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  occurredAt: optionalDateInput,
  reportDeadlineAt: optionalDateInput,
});

export const complianceEventCreateSchema = z.object({
  workerId: z.string().min(1),
  eventType: z.nativeEnum(EventType),
  eventDate: optionalDateInput,
  notes: z.string().optional().nullable(),
});

export const complianceEventUpdateSchema = z.object({
  status: z.nativeEnum(EventStatus).optional(),
  notes: z.string().optional().nullable(),
  approvedBy: z.string().optional().nullable(),
});

export const roleComplianceUpdateSchema = z.object({
  cosJobDescription: z.string().optional(),
  cosOccupationCode: z.string().optional(),
  contractDuties: z.string().optional(),
  internalJobDesc: z.string().optional().nullable(),
  actualDuties: z.string().optional().nullable(),
  needsChangeOfEmployment: z.boolean().optional(),
});

export const roleComplianceReviewSchema = z.object({
  actualDuties: z.string().optional().nullable(),
  internalJobDesc: z.string().optional().nullable(),
});
