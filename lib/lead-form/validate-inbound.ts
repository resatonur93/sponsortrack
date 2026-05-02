import type { LeadFormFieldKey } from "./field-keys";
import type { LeadFieldValidation, LeadFormFieldDTO } from "./types";

export type NormalizedLeadInput = {
  firstName: string | null;
  lastName: string | null;
  composedName: string | null;
  email: string;
  companyName: string | null;
  phone: string | null;
  source: string;
  message: string | null;
};

const BODY_KEY: Record<LeadFormFieldKey, keyof LeadBodyShape> = {
  firstName: "firstName",
  lastName: "lastName",
  email: "email",
  phone: "phone",
  company: "companyName",
  source: "source",
  message: "message",
};

export type LeadBodyShape = {
  firstName?: unknown;
  lastName?: unknown;
  email?: unknown;
  phone?: unknown;
  /** Company — Lead.companyName */
  companyName?: unknown;
  /** İstemci uyumluluğu: `company` aynı alana yazılabilir. */
  company?: unknown;
  source?: unknown;
  message?: unknown;
};

function rawForField(body: LeadBodyShape, fieldKey: LeadFormFieldKey): string {
  if (fieldKey === "company") {
    const cn = body.companyName;
    const cc = body.company;
    const s =
      typeof cn === "string"
        ? cn
        : typeof cc === "string"
          ? cc
          : "";
    return s.trim();
  }
  const k = BODY_KEY[fieldKey];
  const v = body[k];
  return typeof v === "string" ? v.trim() : "";
}

function safeRegex(source: string | null | undefined): RegExp | null {
  if (!source?.trim()) return null;
  try {
    return new RegExp(source, "u");
  } catch {
    return null;
  }
}

function validateOneField(
  fieldKey: LeadFormFieldKey,
  raw: string,
  required: boolean,
  v: LeadFieldValidation | null | undefined
): string | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return required ? "Required" : null;
  }

  const min = v?.minLength;
  const max = v?.maxLength;
  if (min != null && trimmed.length < min) {
    return `Min ${min}`;
  }
  if (max != null && trimmed.length > max) {
    return `Max ${max}`;
  }

  const reFromConfig = safeRegex(v?.pattern ?? null);
  if (reFromConfig && !reFromConfig.test(trimmed)) {
    return "Invalid format";
  }

  const enforceEmail =
    fieldKey === "email" ? v?.enforceEmail !== false : Boolean(v?.enforceEmail);

  if (enforceEmail || fieldKey === "email") {
    const okEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
    if (!okEmail) return "Invalid email";
  }

  if (
    fieldKey === "phone" &&
    v?.phoneIntl &&
    !reFromConfig &&
    !/^[+0-9\s\-().]{8,}$/.test(trimmed)
  ) {
    return "Invalid phone";
  }

  return null;
}

/**
 * Aktif tenant formunda `enabled` olan alanlara göre doğrular.
 */
export function validateLeadAgainstFormConfig(
  rawBody: LeadBodyShape,
  fieldsSorted: LeadFormFieldDTO[]
): { ok: true; data: NormalizedLeadInput } | { ok: false; fieldErrors: Record<string, string> } {
  const fieldErrors: Record<string, string> = {};
  const enabled = fieldsSorted.filter((f) => f.enabled);

  for (const f of enabled) {
    const value = rawForField(rawBody, f.fieldKey);
    const msg = validateOneField(f.fieldKey, value, f.required, f.validation);
    if (msg) fieldErrors[f.fieldKey] = msg;
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  const firstName = rawForField(rawBody, "firstName") || null;
  const lastName = rawForField(rawBody, "lastName") || null;
  const composedName =
    [firstName, lastName].filter(Boolean).join(" ").trim() || null;

  return {
    ok: true,
    data: {
      firstName,
      lastName,
      composedName,
      email: rawForField(rawBody, "email").toLowerCase(),
      companyName: rawForField(rawBody, "company") || null,
      phone: rawForField(rawBody, "phone") || null,
      source: rawForField(rawBody, "source") || "admin_manual",
      message: rawForField(rawBody, "message") || null,
    },
  };
}
