import type { LeadFormFieldKey } from "./field-keys";
import { LEAD_FORM_FIELD_KEYS } from "./field-keys";
import type { LeadFieldValidation } from "./types";

/** Server + admin UI için başlangıç etiketleri (tenant dilinden bağımsız). Admin değiştirebilir. */
const DEFAULT_LABELS: Record<LeadFormFieldKey, string> = {
  firstName: "First name",
  lastName: "Last name",
  email: "Email",
  phone: "Phone",
  company: "Company",
  source: "Source",
  message: "Message",
};

const DEFAULT_PH: Partial<Record<LeadFormFieldKey, string>> = {
  phone: "+44 …",
  company: "Acme Ltd",
  source: "web_form",
  message: "How can we help?",
};

/** Varsayılan doğrulama — admin JSON ile ezebilir. */
export const DEFAULT_VALIDATION: Record<LeadFormFieldKey, LeadFieldValidation> = {
  firstName: { minLength: 1, maxLength: 120 },
  lastName: { minLength: 1, maxLength: 120 },
  email: { minLength: 3, maxLength: 320, enforceEmail: true },
  phone: {
    maxLength: 80,
    phoneIntl: true,
    pattern: "^[+0-9\\s\\-().]{8,}$",
  },
  company: { maxLength: 200 },
  source: { minLength: 1, maxLength: 120 },
  message: { maxLength: 8000 },
};

export type DefaultFieldRow = {
  sortOrder: number;
  fieldKey: LeadFormFieldKey;
  label: string;
  placeholder: string | null;
  enabled: boolean;
  required: boolean;
  validation: LeadFieldValidation | null;
};

export function buildDefaultLeadFormFields(): DefaultFieldRow[] {
  const order = [...LEAD_FORM_FIELD_KEYS];
  return order.map((fieldKey, i) => ({
    sortOrder: i,
    fieldKey,
    label: DEFAULT_LABELS[fieldKey],
    placeholder: DEFAULT_PH[fieldKey] ?? null,
    enabled: true,
    required: fieldKey === "email" || fieldKey === "source",
    validation:
      DEFAULT_VALIDATION[fieldKey] ??
      ({
        maxLength: 500,
      } satisfies LeadFieldValidation),
  }));
}

export function defaultLeadSources(): readonly {
  sortOrder: number;
  value: string;
  label: string;
  isActive: boolean;
}[] {
  return [
    { sortOrder: 0, value: "web_form", label: "Web form", isActive: true },
    { sortOrder: 1, value: "linkedin", label: "LinkedIn", isActive: true },
    { sortOrder: 2, value: "referral", label: "Referral", isActive: true },
    { sortOrder: 3, value: "event", label: "Event", isActive: true },
    { sortOrder: 4, value: "cold_call", label: "Cold call", isActive: true },
    {
      sortOrder: 5,
      value: "admin_manual",
      label: "Manual (admin)",
      isActive: true,
    },
  ];
}
