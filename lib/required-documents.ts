import type { Document, DocumentType, Worker } from "@prisma/client";

export type MissingDocUrgency = "HIGH" | "MEDIUM" | "LOW";

export type RequiredDocRule = {
  documentType: DocumentType;
  label: string;
};

function isSkilledWorker(visaType: string): boolean {
  return /skilled/i.test(visaType);
}

function isScaleUp(visaType: string): boolean {
  return /scale-?up/i.test(visaType);
}

/** Required document types for compliance pack (rule set). */
export function getRequiredDocumentsForWorker(worker: Worker): RequiredDocRule[] {
  const out: RequiredDocRule[] = [];

  if (worker.employmentStatus === "PENDING_START") {
    out.push({ documentType: "COS", label: "Certificate of Sponsorship" });
    out.push({ documentType: "PASSPORT", label: "Passport" });
    return out;
  }

  if (worker.employmentStatus !== "ACTIVE") {
    return out;
  }

  if (isScaleUp(worker.visaType)) {
    out.push({ documentType: "BRP", label: "BRP / immigration status" });
    out.push({ documentType: "SHARE_CODE", label: "Share code evidence" });
  } else if (isSkilledWorker(worker.visaType)) {
    out.push({ documentType: "BRP", label: "BRP / immigration status" });
    out.push({ documentType: "SHARE_CODE", label: "Share code evidence" });
    if (worker.requiresAtasCertificate) {
      out.push({ documentType: "ATAS_CERTIFICATE", label: "ATAS certificate" });
    }
  } else {
    out.push({ documentType: "BRP", label: "BRP / immigration status" });
    out.push({ documentType: "SHARE_CODE", label: "Share code evidence" });
  }

  if (worker.isOffshoreWorker) {
    out.push({
      documentType: "VESSEL_ASSIGNMENT_LETTER",
      label: "Vessel assignment letter",
    });
  }

  if (worker.preRegistrationNurse) {
    out.push({
      documentType: "NMC_REGISTRATION",
      label: "NMC registration",
    });
  }

  return out;
}

function docCoversType(d: Document, t: DocumentType): boolean {
  return d.documentType === t && !d.isDeleted;
}

function isExpired(d: Document, now: Date): boolean {
  return d.expiryDate != null && d.expiryDate < now;
}

function expiresWithinDays(d: Document, now: Date, days: number): boolean {
  if (!d.expiryDate) return false;
  const limit = new Date(now);
  limit.setDate(limit.getDate() + days);
  return d.expiryDate >= now && d.expiryDate <= limit;
}

export type MissingDocumentItem = {
  documentType: DocumentType;
  label: string;
  urgency: MissingDocUrgency;
  reason: "missing" | "expired" | "expiring_soon";
};

export function evaluateMissingDocuments(
  worker: Worker,
  documents: Document[],
  now: Date = new Date()
): MissingDocumentItem[] {
  const required = getRequiredDocumentsForWorker(worker);
  const missing: MissingDocumentItem[] = [];

  for (const r of required) {
    const candidates = documents.filter((d) => docCoversType(d, r.documentType));
    if (candidates.length === 0) {
      missing.push({
        documentType: r.documentType,
        label: r.label,
        urgency: "LOW",
        reason: "missing",
      });
      continue;
    }
    const latest = candidates.sort(
      (a, b) => b.uploadDate.getTime() - a.uploadDate.getTime()
    )[0];
    if (isExpired(latest, now)) {
      missing.push({
        documentType: r.documentType,
        label: r.label,
        urgency: "HIGH",
        reason: "expired",
      });
    } else if (expiresWithinDays(latest, now, 30)) {
      missing.push({
        documentType: r.documentType,
        label: r.label,
        urgency: "MEDIUM",
        reason: "expiring_soon",
      });
    }
  }

  return missing;
}
