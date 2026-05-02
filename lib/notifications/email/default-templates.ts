import type {
  DocumentExpiryReminderKind,
  NotificationComplianceAnchorDomain,
} from "@prisma/client";
import {
  COMPLIANCE_VARIABLE_HINTS,
  DOCUMENT_EMAIL_VARIABLE_HINTS,
  allComplianceTemplateKeys,
  allDocumentExpiryTemplateKeys,
  complianceAnchorTemplateKey,
  documentExpiryTemplateKey,
} from "./template-keys";

function anchorTopicPair(
  domain: NotificationComplianceAnchorDomain
): { tr: string; en: string } {
  switch (domain) {
    case "VISA_EXPIRY":
      return { tr: "Vize süresi", en: "Visa validity" };
    case "RIGHT_TO_WORK_RECHECK":
      return {
        tr: "Right to Work yeniden kontrol tarihi",
        en: "Right to Work recheck date",
      };
    case "SPONSORSHIP_END":
      return {
        tr: "Sponsorluk süresinin bitişi",
        en: "Sponsorship coverage end date",
      };
    case "COS_EXPIRY":
      return {
        tr: "Certificate of Sponsorship (CoS) süresi",
        en: "Certificate of Sponsorship (CoS) validity",
      };
  }
}

export function complianceDefaultStrings(
  domain: NotificationComplianceAnchorDomain,
  kind: DocumentExpiryReminderKind,
  reminderOffsetDays?: number
): {
  subjectTr: string;
  subjectEn: string;
  bodyTr: string;
  bodyEn: string;
  variableHints: string[];
} {
  const who = "{{companyName}} · {{workerName}}";
  const { tr: trTopic, en: enTopic } = anchorTopicPair(domain);
  const variableHints = [...COMPLIANCE_VARIABLE_HINTS] as unknown as string[];
  switch (kind) {
    case "BEFORE_60":
    case "BEFORE_30":
    case "BEFORE_7": {
      const n = reminderOffsetDays ?? (kind === "BEFORE_60" ? 60 : kind === "BEFORE_30" ? 30 : 7);
      const tag = kind === "BEFORE_7" ? "KRİTİK" : "Hatırlatma";
      const tagEn =
        kind === "BEFORE_7" ? "CRITICAL REMINDER" : "Reminder";
      return {
        subjectTr: `[SponsorTrack] ${tag}: ${trTopic} — ${n} gün · {{workerName}}`,
        subjectEn: `[SponsorTrack] ${tagEn}: ${enTopic} — ${n} days · {{workerName}}`,
        bodyTr:
          `${trTopic} · ${who} için kritik tarihe ({{expiryDate}}) UTC takvimine göre ${n} gün kalmıştır.`,
        bodyEn:
          `${enTopic} — ${who}: ${n} calendar days remain until the UTC anchor {{expiryDate}}.`,
        variableHints,
      };
    }
    case "EXPIRY_DAY":
      return {
        subjectTr: `[SponsorTrack] BUGÜN: ${trTopic} · {{workerName}}`,
        subjectEn: `[SponsorTrack] TODAY: ${enTopic} · {{workerName}}`,
        bodyTr: `${trTopic} · ${who} için bağlayıcı UTC takvim günü bugündür ({{expiryDate}}).`,
        bodyEn: `${enTopic} — ${who}: today is the scheduled UTC anchor calendar day ({{expiryDate}}).`,
        variableHints,
      };
    case "AFTER_EXPIRED":
      return {
        subjectTr: `[SponsorTrack] Geciken aksiyon: ${trTopic} · {{workerName}}`,
        subjectEn: `[SponsorTrack] Overdue action: ${enTopic} · {{workerName}}`,
        bodyTr:
          `${trTopic} · ${who} için kritik tarih geçmiştir ({{expiryDate}}); uyum ve raporlama adımlarını gözden geçirin.`,
        bodyEn:
          `${enTopic} — ${who}: the UTC anchor {{expiryDate}} has passed — review sponsorship / reporting duties.`,
        variableHints,
      };
    default:
      return {
        subjectTr: `[SponsorTrack] ${trTopic} · {{workerName}}`,
        subjectEn: `[SponsorTrack] ${enTopic} · {{workerName}}`,
        bodyTr: "Uyumluluk hatırlatması.",
        bodyEn: "Compliance reminder.",
        variableHints,
      };
  }
}

export function documentExpiryDefaultStrings(
  kind: DocumentExpiryReminderKind,
  reminderOffsetDays?: number
): {
  subjectTr: string;
  subjectEn: string;
  bodyTr: string;
  bodyEn: string;
  variableHints: string[];
} {
  const who =
    "{{documentTypeTr}} — {{companyName}} / {{workerName}}";
  const variableHints = [...DOCUMENT_EMAIL_VARIABLE_HINTS] as unknown as string[];
  switch (kind) {
    case "BEFORE_60":
    case "BEFORE_30":
    case "BEFORE_7": {
      const n =
        reminderOffsetDays ?? (kind === "BEFORE_60" ? 60 : kind === "BEFORE_30" ? 30 : 7);
      return {
        subjectTr: `[SponsorTrack] Belge: ${n} gün kala · ${who}`,
        subjectEn: `[SponsorTrack] Document: ${n} days before expiry · {{documentTypeEn}} — {{companyName}} / {{workerName}}`,
        bodyTr: `Çalışan belgesinin süresinin dolmasına UTC takvimine göre ${n} gün kalmıştır.`,
        bodyEn: `A worker document expires in ${n} calendar days (UTC), expiry date {{expiryDate}}.`,
        variableHints,
      };
    }
    case "EXPIRY_DAY":
      return {
        subjectTr: `[SponsorTrack] Belge: son geçerlilik günü · ${who}`,
        subjectEn: `[SponsorTrack] Document: expiry calendar day · {{documentTypeEn}} — {{companyName}} / {{workerName}}`,
        bodyTr:
          "Bu belge için bitiş tarihinin takvimde bugün olduğu bildirilir (UTC).",
        bodyEn:
          "Today is the document’s expiry calendar day (UTC), expiry date {{expiryDate}}.",
        variableHints,
      };
    case "AFTER_EXPIRED":
      return {
        subjectTr: `[SponsorTrack] Süresi doldu: {{documentTypeTr}} · {{companyName}} / {{workerName}}`,
        subjectEn: `[SponsorTrack] Expired: {{documentTypeEn}} · {{companyName}} / {{workerName}}`,
        bodyTr: "Çalışan belgesinin süresi geçmiştir.",
        bodyEn: "The following worker document has passed its expiry date ({{expiryDate}}).",
        variableHints,
      };
    default:
      return {
        subjectTr: `[SponsorTrack] Belge · ${who}`,
        subjectEn: `[SponsorTrack] Document · {{documentTypeEn}}`,
        bodyTr: "Belge bildirimi.",
        bodyEn: "Document notification.",
        variableHints,
      };
  }
}

/** Seed / API için tek şablon satırının varsayılan metni. */
export function defaultPartialForTemplateKey(templateKey: string): {
  subjectTr: string;
  subjectEn: string;
  bodyTr: string;
  bodyEn: string;
  variableHints: string[];
} {
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
  for (const d of domains) {
    for (const k of kinds) {
      if (complianceAnchorTemplateKey(d, k) === templateKey) {
        const reminderOffsetDays =
          k === "BEFORE_60" ? 60 : k === "BEFORE_30" ? 30 : k === "BEFORE_7" ? 7 : undefined;
        return complianceDefaultStrings(d, k, reminderOffsetDays);
      }
    }
  }
  for (const k of kinds) {
    if (documentExpiryTemplateKey(k) === templateKey) {
      const reminderOffsetDays =
        k === "BEFORE_60" ? 60 : k === "BEFORE_30" ? 30 : k === "BEFORE_7" ? 7 : undefined;
      return documentExpiryDefaultStrings(k, reminderOffsetDays);
    }
  }
  return {
    subjectTr: "[SponsorTrack] Bildirim",
    subjectEn: "[SponsorTrack] Notification",
    bodyTr: "Şablon metni düzenlenebilir.",
    bodyEn: "Template body is editable.",
    variableHints: [...COMPLIANCE_VARIABLE_HINTS] as unknown as string[],
  };
}

export function canonicalTemplateCatalogKeys(): readonly string[] {
  return [...allComplianceTemplateKeys(), ...allDocumentExpiryTemplateKeys()];
}
