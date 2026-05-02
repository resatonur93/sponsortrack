import type { LeadFormFieldKey } from "./field-keys";

export type LeadFieldValidation = {
  minLength?: number;
  maxLength?: number;
  /** Varsa `RegExp` ile test edilir; hatalı regex sunucuda yoksayılır. */
  pattern?: string | null;
  /** Alan `email` iken varsayılan true kabul edilir. */
  enforceEmail?: boolean;
  /** Rahat tel. kontrolü: uluslararası rakam/+ ve ayraçlar. */
  phoneIntl?: boolean;
};

/** API GET/PUT ve istemci durumu */
export type LeadFormFieldDTO = {
  id?: string;
  sortOrder: number;
  fieldKey: LeadFormFieldKey;
  label: string;
  placeholder: string | null;
  enabled: boolean;
  required: boolean;
  validation: LeadFieldValidation | null;
};

export type LeadFormSourceDTO = {
  id?: string;
  sortOrder: number;
  value: string;
  label: string;
  isActive: boolean;
};

export type LeadFormConfigDTO = {
  settingsId?: string;
  fields: LeadFormFieldDTO[];
  sources: LeadFormSourceDTO[];
};
