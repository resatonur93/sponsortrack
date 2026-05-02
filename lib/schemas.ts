import { z } from "zod";
import {
  AbsenceStatus,
  AbsenceType,
  ChangeCategory,
  ComplianceRiskLevel,
  DocumentFolder,
  DocumentType,
  DocumentVaultFolder,
  EmploymentStatus,
  EventStatus,
  EventType,
  OrgChangeStatus,
  OrgChangeType,
  PolicyCategory,
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

export const notificationDeferSchema = z.object({
  days: z.coerce.number().int().min(1).max(90).optional().default(7),
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
  "VISA_EXPIRING_60_DAYS",
  "VISA_EXPIRING_30_DAYS",
  "VISA_EXPIRING_7_DAYS",
  "RIGHT_TO_WORK_RECHECK_60_DAYS",
  "RIGHT_TO_WORK_RECHECK_30_DAYS",
  "RIGHT_TO_WORK_RECHECK_7_DAYS",
  "SPONSORSHIP_ENDING_60_DAYS",
  "SPONSORSHIP_ENDING_30_DAYS",
  "SPONSORSHIP_ENDING_7_DAYS",
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
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().positive(),
  fileHash: z.string().min(32),
  expiryDate: optionalDateInput,
  complianceEventId: z.string().optional().nullable(),
  metadata: z.record(z.unknown()).optional().nullable(),
  replacesDocumentId: z.string().optional().nullable(),
});

export const documentVaultCreateSchema = z.object({
  folder: z.nativeEnum(DocumentFolder),
  fileName: z.string().min(1),
  fileUrl: z.string().min(1),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().positive(),
  fileHash: z.string().min(32),
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
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().positive(),
  fileHash: z.string().min(32),
  /** Omit to leave unchanged; empty string clears */
  expiryDate: optionalIsoDate,
  retentionUntil: optionalIsoDate,
});

export const contactAttemptSchema = z.object({
  date: dateInput,
  method: z.string().min(1),
  result: z.string().min(1),
});

export const absenceCreateSchema = z
  .object({
    startDate: dateInput,
    endDate: optionalDateInput,
    type: z.nativeEnum(AbsenceType),
    status: z.nativeEnum(AbsenceStatus).optional(),
    isAuthorised: z.boolean().optional(),
    approvedBy: z.string().optional().nullable(),
    reason: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
    contactAttempts: z.array(contactAttemptSchema).optional().default([]),
    returnToWorkDate: optionalDateInput,
    returnToWorkNotes: z.string().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.type === AbsenceType.UNAUTHORISED) {
      if (!data.contactAttempts?.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "At least one contact attempt is required for unauthorised absence",
          path: ["contactAttempts"],
        });
      }
    }
  });

export const absenceUpdateSchema = z.object({
  endDate: optionalDateInput,
  type: z.nativeEnum(AbsenceType).optional(),
  status: z.nativeEnum(AbsenceStatus).optional(),
  isAuthorised: z.boolean().optional(),
  approvedBy: z.string().optional().nullable(),
  reason: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  contactAttempts: z.array(contactAttemptSchema).optional(),
  returnToWorkDate: optionalDateInput,
  returnToWorkNotes: z.string().optional().nullable(),
});

export const absenceContactAttemptSchema = contactAttemptSchema;

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

export const orgChangeCreateSchema = z.object({
  changeType: z.nativeEnum(OrgChangeType),
  description: z.string().min(1),
  effectiveDate: dateInput,
  hoReportDeadline: dateInput,
  status: z.nativeEnum(OrgChangeStatus).optional(),
  reportedToHO: z.boolean().optional(),
  hoReportDate: optionalDateInput,
  evidenceDocuments: z.array(z.string()).optional(),
  approvedBy: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const orgChangeUpdateSchema = z.object({
  changeType: z.nativeEnum(OrgChangeType).optional(),
  description: z.string().min(1).optional(),
  effectiveDate: dateInput.optional(),
  hoReportDeadline: dateInput.optional(),
  status: z.nativeEnum(OrgChangeStatus).optional(),
  reportedToHO: z.boolean().optional(),
  hoReportDate: optionalDateInput,
  evidenceDocuments: z.array(z.string()).optional(),
  approvedBy: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const orgChangeReportToHoSchema = z.object({
  hoReportDate: optionalDateInput,
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

export const workflowSubmitSchema = z.object({
  managerUserId: z.string().cuid().optional().nullable(),
  complianceUserId: z.string().cuid().optional().nullable(),
  aoUserId: z.string().cuid().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const workflowNotesSchema = z.object({
  notes: z.string().optional().nullable(),
});

export const workflowEscalateSchema = z.object({
  assignToUserId: z.string().cuid(),
  notes: z.string().optional().nullable(),
});

const smsDraftOverridesSchema = z
  .object({
    oldSalary: z.number().int().optional(),
    newSalary: z.number().int().optional(),
    oldWorkLocation: z.string().optional().nullable(),
    newWorkLocation: z.string().optional().nullable(),
  })
  .optional();

export const smsDraftGenerateBodySchema = z.object({
  internalNotes: z.string().optional().nullable(),
  overrides: smsDraftOverridesSchema,
});

export const smsDraftMarkSentSchema = z.object({
  sentAt: optionalDateInput,
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

export const salaryRecordCreateSchema = z.object({
  periodStart: dateInput,
  periodEnd: dateInput,
  contractedSalary: z.number().int(),
  actualPaid: z.number().int(),
  currency: z.string().min(1).optional().default("GBP"),
  hoursWorked: z.number().int().optional().nullable(),
  overtime: z.number().int().optional().nullable(),
  deductions: z.record(z.unknown()).optional().nullable(),
  evidenceUrl: z.string().optional().nullable(),
  approvedBy: z.string().optional().nullable(),
});

const decimalish = z.union([z.number(), z.string()]);

export const selfServiceLoginSchema = z
  .object({
    email: z.string().trim().email().optional(),
    dateOfBirth: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
      .optional(),
    portalToken: z.string().min(1).optional(),
  })
  .refine(
    (v) =>
      (v.email && v.dateOfBirth) || v.portalToken,
    "Provide email and date of birth, or portalToken"
  );

export const selfServiceProfileUpdateSchema = z.object({
  currentAddress: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  personalEmail: z.preprocess(
    (v) => (v === "" || v === null ? null : v),
    z.union([z.string().email(), z.null()]).optional()
  ),
  emergencyContact: z.string().optional().nullable(),
  emergencyPhone: z.string().optional().nullable(),
});

export const policyCreateSchema = z
  .object({
    title: z.string().trim().min(1).max(256),
    content: z.string(),
    version: z.string().trim().min(1).max(64),
    effectiveDate: dateInput,
    category: z.nativeEnum(PolicyCategory),
    isAcknowledgementRequired: z.boolean(),
    fileUrl: z.preprocess(
      (v) => (v === "" || v === null || v === undefined ? null : String(v)),
      z.union([z.string().max(2048), z.null()])
    ),
  })
  .superRefine((d, ctx) => {
    if (d.content.trim().length === 0 && !d.fileUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "contentOrAttachment",
        path: ["content"],
      });
    }
    if (d.fileUrl && !d.fileUrl.startsWith("https://")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "httpsOnly",
        path: ["fileUrl"],
      });
    }
  });

export const ukLawCheckUpdateSchema = z.object({
  nmwCompliant: z.boolean().optional().nullable(),
  hourlyRate: decimalish.optional().nullable(),
  hoursPerWeek: decimalish.optional().nullable(),
  weeklyHours: decimalish.optional().nullable(),
  maxWeeklyHours: decimalish.optional(),
  optOutSigned: z.boolean().optional(),
  annualEntitlement: decimalish.optional(),
  daysTaken: decimalish.optional().nullable(),
  daysRemaining: decimalish.optional().nullable(),
  contractIssued: optionalDateInput,
  contractType: z.string().min(1).optional(),
  flags: z.array(z.string()).optional(),
});
