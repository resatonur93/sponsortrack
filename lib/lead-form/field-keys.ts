export const LEAD_FORM_FIELD_KEYS = [
  "firstName",
  "lastName",
  "email",
  "phone",
  "company",
  "source",
  "message",
] as const;

export type LeadFormFieldKey = (typeof LEAD_FORM_FIELD_KEYS)[number];

export function isLeadFormFieldKey(s: string): s is LeadFormFieldKey {
  return (LEAD_FORM_FIELD_KEYS as readonly string[]).includes(s);
}
