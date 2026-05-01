import type { Document, DocumentType, Worker } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { addDays, startOfDay } from "@/lib/dates";

/** UK sponsor appendix-style route tagging */
export type VisaComplianceRoute =
  | "PRE_START"
  | "ACTIVE_SKILLED_WORKER"
  | "ACTIVE_SCALE_UP"
  | "ACTIVE_HEALTH_AND_CARE_GLOBAL"
  | "ACTIVE_GENERAL_SPONSORED"
  | "ACTIVE_OFFSHORE";

const ACTIVE_NON_OFFSHORE: VisaComplianceRoute[] = [
  "ACTIVE_SKILLED_WORKER",
  "ACTIVE_SCALE_UP",
  "ACTIVE_HEALTH_AND_CARE_GLOBAL",
  "ACTIVE_GENERAL_SPONSORED",
];

const ALL_APPENDIX_ROUTES: VisaComplianceRoute[] = [
  "PRE_START",
  ...ACTIVE_NON_OFFSHORE,
  "ACTIVE_OFFSHORE",
];

/** Matrix row — Appendix D–aligned checklist slot */
export type ComplianceDocRequirement = {
  slotId: string;
  /** visaRoute buckets this row applies to */
  requiredFor: VisaComplianceRoute[];
  documentTypesAccepted: DocumentType[];
  isMandatory: boolean;
  deadlineDays: number | null;
  label: string;
  description: string;
  primaryDocumentType: DocumentType;
};

export type MissingDocUrgency = "HIGH" | "MEDIUM" | "LOW";

function isSkilledWorker(visaType: string): boolean {
  return /skilled/i.test(visaType);
}

function isScaleUp(visaType: string): boolean {
  return /scale[-\s]?up/i.test(visaType);
}

function isHealthAndCareWorker(visaType: string): boolean {
  return /health|c\s?are|hca|hbc|glob.*care|care.*worker/i.test(visaType);
}

/**
 * Appendix D route from worker — TERMINATED → null (no checklist).
 */
export function resolveVisaComplianceRoute(worker: Worker): VisaComplianceRoute | null {
  if (worker.employmentStatus === "TERMINATED") return null;
  if (worker.employmentStatus === "PENDING_START") return "PRE_START";
  if (worker.isOffshoreWorker) return "ACTIVE_OFFSHORE";
  if (isHealthAndCareWorker(worker.visaType)) return "ACTIVE_HEALTH_AND_CARE_GLOBAL";
  if (isScaleUp(worker.visaType)) return "ACTIVE_SCALE_UP";
  if (isSkilledWorker(worker.visaType)) return "ACTIVE_SKILLED_WORKER";
  return "ACTIVE_GENERAL_SPONSORED";
}

function anchorComplianceDate(worker: Worker): Date {
  return worker.employmentStartDate ?? worker.cosAssignDate ?? worker.createdAt;
}

type MatrixDef = {
  slotId: string;
  requiredFor: VisaComplianceRoute[];
  documentTypesAccepted: DocumentType[];
  isMandatory: boolean;
  deadlineDays: number | null;
  label: string;
  description: string;
  /** When omitted, row applies whenever route matches */
  includeWhen?: (w: Worker) => boolean;
};

const APPENDIX_D_MATRIX_RAW: MatrixDef[] = [
  {
    slotId: "appendix-certificate-of-sponsorship",
    requiredFor: ALL_APPENDIX_ROUTES,
    documentTypesAccepted: ["COS"],
    isMandatory: true,
    deadlineDays: 42,
    label: "CoS / Sponsor assign",
    description:
      "Certificate of Sponsorship particulars (SOC, remuneration, migrant details) evidencing lawful sponsorship allocation.",
  },
  {
    slotId: "appendix-passport-or-digital-status",
    requiredFor: ALL_APPENDIX_ROUTES,
    documentTypesAccepted: ["PASSPORT", "EVISA", "VISA", "BRP"],
    isMandatory: true,
    deadlineDays: 28,
    label: "Pasaport / eVisa / giriş ve kalış izni kanıtı",
    description:
      "Travel document plus digital immigration status confirmation (UKVI eVisa, vignette endorsement, legacy BRP) matching Appendix D identity bundle.",
  },
  {
    slotId: "appendix-right-to-work-share-code",
    requiredFor: ALL_APPENDIX_ROUTES,
    documentTypesAccepted: ["SHARE_CODE", "RIGHT_TO_WORK"],
    isMandatory: true,
    deadlineDays: 14,
    label: "Right to Work (share code / doğrulama)",
    description:
      "Lawful Right to Work check evidence retained before employment (ECS share code screenshots, manual check record, or Employer Portal excerpt).",
  },
  {
    slotId: "appendix-employment-contract",
    requiredFor: ACTIVE_NON_OFFSHORE.concat(["ACTIVE_OFFSHORE"]),
    documentTypesAccepted: ["EMPLOYMENT_CONTRACT"],
    isMandatory: true,
    deadlineDays: 21,
    label: "İş sözleşmesi",
    description:
      "Signed contract or statutory written statement aligning with COS (role, remuneration, SOC, deductions). Appendix D contractual pack.",
    includeWhen: (w) => w.employmentStatus !== "PENDING_START",
  },
  {
    slotId: "appendix-payroll-proof",
    requiredFor: ACTIVE_NON_OFFSHORE.concat(["ACTIVE_OFFSHORE"]),
    documentTypesAccepted: ["PAYSLIP_PAYMENT_PROOF"],
    isMandatory: true,
    deadlineDays: 56,
    label: "Maaş bordrosu / ödeme kanıtı",
    description:
      "Sponsor monitoring evidence: recent payslip / FPS / RTI excerpt proving salary payment as reported to HMRC.",
    includeWhen: (w) => w.employmentStatus !== "PENDING_START",
  },
  {
    slotId: "appendix-contact-details-hr-record",
    requiredFor: ACTIVE_NON_OFFSHORE.concat(["ACTIVE_OFFSHORE"]),
    documentTypesAccepted: ["CONTACT_DETAILS_RECORD"],
    isMandatory: true,
    deadlineDays: 35,
    label: "İletişim bilgileri (adres, telefon)",
    description:
      "HR-held contact record (address evidence and telephone/email reachability) aligned with sponsor contact monitoring duties.",
    includeWhen: (w) => w.employmentStatus !== "PENDING_START",
  },
  {
    slotId: "appendix-recruitment-pack",
    requiredFor: ACTIVE_NON_OFFSHORE.concat(["ACTIVE_OFFSHORE"]),
    documentTypesAccepted: ["RECRUITMENT_FILE"],
    isMandatory: true,
    deadlineDays: 42,
    label: "İşe alım süreci (CV, ilan, mülakat notları)",
    description:
      "Resident labour market / fair recruitment file: advert, interview notes, competitive selection records per sponsor guidance.",
    includeWhen: (w) => w.employmentStatus !== "PENDING_START",
  },
  {
    slotId: "appendix-atas",
    requiredFor: ALL_APPENDIX_ROUTES,
    documentTypesAccepted: ["ATAS_CERTIFICATE"],
    isMandatory: true,
    deadlineDays: 28,
    label: "ATAS sertifikası",
    description:
      "Academic Technology Approval Scheme certificate when CoS requires ATAS clearance for research-sensitive roles.",
    includeWhen: (w) => w.requiresAtasCertificate,
  },
  {
    slotId: "appendix-offshore-assignment",
    requiredFor: ["ACTIVE_OFFSHORE"],
    documentTypesAccepted: ["VESSEL_ASSIGNMENT_LETTER"],
    isMandatory: true,
    deadlineDays: 21,
    label: "Görevlendirme (offshore)",
    description:
      "Offshore deployment letter aligning with COS work location commitments for flagged offshore workers.",
    includeWhen: (w) => w.isOffshoreWorker,
  },
  {
    slotId: "appendix-regulated-health-registration",
    requiredFor: ALL_APPENDIX_ROUTES,
    documentTypesAccepted: ["NMC_REGISTRATION"],
    isMandatory: true,
    deadlineDays: 28,
    label: "Profesyonel sicil kaydı (NMC / regulator)",
    description:
      "Live professional registration excerpt (NMC/HCPC) when CoS designates a regulated-health occupation.",
    includeWhen: (w) =>
      !!w.preRegistrationNurse ||
      /\bnmc\b|registered nurse|rgn|regulated health/i.test(
        `${w.jobTitle ?? ""} ${w.jobDescription ?? ""}`
      ),
  },
];

function toComplianceRow(raw: MatrixDef): ComplianceDocRequirement {
  const { includeWhen: _omit, ...rest } = raw;
  return {
    ...rest,
    primaryDocumentType: raw.documentTypesAccepted[0],
  };
}

/**
 * Rows for this worker — replaces legacy COS/PASSPORT-only pending rules with Appendix D packs.
 */
export function getRequiredDocumentsForWorker(worker: Worker): ComplianceDocRequirement[] {
  const route = resolveVisaComplianceRoute(worker);
  if (!route) return [];

  const out: ComplianceDocRequirement[] = [];

  for (const raw of APPENDIX_D_MATRIX_RAW) {
    if (!raw.requiredFor.includes(route)) continue;
    if (raw.includeWhen && !raw.includeWhen(worker)) continue;
    out.push(toComplianceRow(raw));
  }

  return out.sort((a, b) => a.slotId.localeCompare(b.slotId));
}

function docCoversAccepted(d: Document, accepted: DocumentType[]): boolean {
  return accepted.includes(d.documentType) && !d.isDeleted;
}

function isExpiredDoc(d: Document, now: Date): boolean {
  return d.expiryDate != null && d.expiryDate < now;
}

function expiresWithinDays(d: Document, now: Date, days: number): boolean {
  if (!d.expiryDate) return false;
  const limit = new Date(now);
  limit.setDate(limit.getDate() + days);
  return d.expiryDate >= now && d.expiryDate <= limit;
}

function latestForAccepted(documents: Document[], accepted: DocumentType[]): Document | null {
  const candidates = documents.filter((d) => docCoversAccepted(d, accepted));
  if (candidates.length === 0) return null;
  return candidates.sort((a, b) => b.uploadDate.getTime() - a.uploadDate.getTime())[0];
}

/** Mandatory missing / deadline breach → higher urgency */
function missingUrgency(
  slot: ComplianceDocRequirement,
  anchor: Date,
  now: Date
): MissingDocUrgency {
  if (!slot.isMandatory) return "LOW";
  if (slot.deadlineDays == null) return "MEDIUM";
  const due = addDays(startOfDay(anchor), slot.deadlineDays);
  return now > due ? "HIGH" : "MEDIUM";
}

export type MissingDocumentItem = {
  slotId: string;
  documentType: DocumentType;
  documentTypesAccepted: DocumentType[];
  label: string;
  description: string;
  urgency: MissingDocUrgency;
  reason: "missing" | "expired" | "expiring_soon";
};

export type DocumentChecklistItem = {
  slotId: string;
  documentType: DocumentType;
  documentTypesAccepted: DocumentType[];
  label: string;
  description: string;
  isMandatory: boolean;
  deadlineDays: number | null;
  status: "ok" | "missing" | "expired" | "expiring_soon";
  urgency: MissingDocUrgency | null;
  latest: {
    id: string;
    fileName: string;
    uploadDate: string;
    expiryDate: string | null;
  } | null;
};

export function buildDocumentChecklist(
  worker: Worker,
  documents: Document[],
  now: Date = new Date()
): DocumentChecklistItem[] {
  const required = getRequiredDocumentsForWorker(worker);
  const anchor = anchorComplianceDate(worker);
  const items: DocumentChecklistItem[] = [];

  for (const r of required) {
    const latest = latestForAccepted(documents, r.documentTypesAccepted);
    const base = {
      slotId: r.slotId,
      documentType: r.primaryDocumentType,
      documentTypesAccepted: r.documentTypesAccepted,
      label: r.label,
      description: r.description,
      isMandatory: r.isMandatory,
      deadlineDays: r.deadlineDays,
    };

    if (!latest) {
      items.push({
        ...base,
        status: "missing",
        urgency: missingUrgency(r, anchor, now),
        latest: null,
      });
      continue;
    }

    const latestPayload = {
      id: latest.id,
      fileName: latest.fileName,
      uploadDate: latest.uploadDate.toISOString(),
      expiryDate: latest.expiryDate ? latest.expiryDate.toISOString() : null,
    };

    if (isExpiredDoc(latest, now)) {
      items.push({
        ...base,
        status: "expired",
        urgency: r.isMandatory ? "HIGH" : "MEDIUM",
        latest: latestPayload,
      });
    } else if (expiresWithinDays(latest, now, 30)) {
      items.push({
        ...base,
        status: "expiring_soon",
        urgency: "MEDIUM",
        latest: latestPayload,
      });
    } else {
      items.push({
        ...base,
        status: "ok",
        urgency: null,
        latest: latestPayload,
      });
    }
  }

  return items;
}

export function evaluateMissingDocuments(
  worker: Worker,
  documents: Document[],
  now: Date = new Date()
): MissingDocumentItem[] {
  return buildDocumentChecklist(worker, documents, now)
    .filter((i) => i.status !== "ok")
    .map((i) => ({
      slotId: i.slotId,
      documentType: i.documentType,
      documentTypesAccepted: i.documentTypesAccepted,
      label: i.label,
      description: i.description,
      urgency: (i.urgency ?? "LOW") as MissingDocUrgency,
      reason: i.status,
    }));
}

export type ComplianceChecklistBundle = {
  workerId: string;
  route: VisaComplianceRoute | null;
  anchorDateIso: string;
  checklist: DocumentChecklistItem[];
  missing: MissingDocumentItem[];
};

/**
 * Worker + document fetch with tenant-scoped Prisma client; returns structured Appendix D checklist.
 */
export async function getComplianceChecklist(
  db: Pick<PrismaClient, "worker">,
  workerId: string,
  now: Date = new Date()
): Promise<ComplianceChecklistBundle | null> {
  const w = await db.worker.findUnique({
    where: { id: workerId },
    include: { documents: { where: { isDeleted: false } } },
  });
  if (!w) return null;

  const route = resolveVisaComplianceRoute(w);
  const checklist = buildDocumentChecklist(w, w.documents, now);
  const missing = evaluateMissingDocuments(w, w.documents, now);

  return {
    workerId: w.id,
    route,
    anchorDateIso: anchorComplianceDate(w).toISOString(),
    checklist,
    missing,
  };
}
