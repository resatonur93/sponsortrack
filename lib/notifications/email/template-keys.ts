import type {
  DocumentExpiryReminderKind,
  NotificationComplianceAnchorDomain,
} from "@prisma/client";

export const COMPLIANCE_VARIABLE_HINTS = [
  "workerName",
  "companyName",
  "expiryDate",
  "cosReference",
  "workerUrl",
  "notificationsUrl",
  "anchorLabelTr",
  "anchorLabelEn",
] as const;

export const DOCUMENT_EMAIL_VARIABLE_HINTS = [
  ...COMPLIANCE_VARIABLE_HINTS,
  "documentTypeTr",
  "documentTypeEn",
  "fileName",
  "documentId",
] as const;

function kindMidfix(kind: DocumentExpiryReminderKind): string {
  switch (kind) {
    case "BEFORE_60":
      return "_60_DAYS";
    case "BEFORE_30":
      return "_30_DAYS";
    case "BEFORE_7":
      return "_7_DAYS";
    case "EXPIRY_DAY":
      return "_LAST_DAY";
    case "AFTER_EXPIRED":
      return "_AFTER_EXPIRED";
    default:
      return "_UNKNOWN";
  }
}

/** Uyumluluk e-postaları için veritabanı şablon anahtarı (UI ile aynı isimler). */
export function complianceAnchorTemplateKey(
  domain: NotificationComplianceAnchorDomain,
  kind: DocumentExpiryReminderKind
): string {
  const mid = kindMidfix(kind);
  switch (domain) {
    case "VISA_EXPIRY":
      return `VISA_EXPIRING${mid}`;
    case "COS_EXPIRY":
      return `COS_EXPIRING${mid}`;
    case "SPONSORSHIP_END":
      return `SPONSORSHIP_ENDING${mid}`;
    case "RIGHT_TO_WORK_RECHECK":
      return `RIGHT_TO_WORK_RECHECK${mid}`;
  }
}

export function documentExpiryTemplateKey(
  kind: DocumentExpiryReminderKind
): string {
  if (kind === "AFTER_EXPIRED") return "DOCUMENT_AFTER_EXPIRED";
  const mid = kindMidfix(kind);
  return `DOCUMENT_EXPIRING${mid}`;
}

export function allComplianceTemplateKeys(): string[] {
  const domains: NotificationComplianceAnchorDomain[] = [
    "VISA_EXPIRY",
    "COS_EXPIRY",
    "SPONSORSHIP_END",
    "RIGHT_TO_WORK_RECHECK",
  ];
  const kinds: DocumentExpiryReminderKind[] = [
    "BEFORE_60",
    "BEFORE_30",
    "BEFORE_7",
    "EXPIRY_DAY",
    "AFTER_EXPIRED",
  ];
  const out: string[] = [];
  for (const d of domains) {
    for (const k of kinds) out.push(complianceAnchorTemplateKey(d, k));
  }
  return out;
}

export function allDocumentExpiryTemplateKeys(): string[] {
  return [
    ...(
      ["BEFORE_60", "BEFORE_30", "BEFORE_7", "EXPIRY_DAY"] as const
    ).map((k) => documentExpiryTemplateKey(k)),
    documentExpiryTemplateKey("AFTER_EXPIRED"),
  ];
}
