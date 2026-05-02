import { randomUUID } from "crypto";
import type { LeadFormField, LeadFormSettings, LeadFormSourceOption } from "@prisma/client";
import { prismaBase } from "@/lib/prisma";
import {
  buildDefaultLeadFormFields,
  defaultLeadSources,
} from "@/lib/lead-form/defaults";
import type { LeadFormFieldKey } from "@/lib/lead-form/field-keys";
import { LEAD_FORM_FIELD_KEYS, isLeadFormFieldKey } from "@/lib/lead-form/field-keys";
import type {
  LeadFormConfigDTO,
  LeadFormFieldDTO,
  LeadFormSourceDTO,
} from "@/lib/lead-form/types";

function rowToFieldDTO(r: LeadFormField): LeadFormFieldDTO {
  const fk = r.fieldKey;
  if (!isLeadFormFieldKey(fk)) {
    throw new Error(`Invalid stored fieldKey: ${fk}`);
  }
  return {
    id: r.id,
    sortOrder: r.sortOrder,
    fieldKey: fk as LeadFormFieldKey,
    label: r.label,
    placeholder: r.placeholder,
    enabled: r.enabled,
    required: r.required,
    validation:
      r.validation && typeof r.validation === "object" && !Array.isArray(r.validation)
        ? (r.validation as LeadFormFieldDTO["validation"])
        : null,
  };
}

function rowToSourceDTO(r: LeadFormSourceOption): LeadFormSourceDTO {
  return {
    id: r.id,
    sortOrder: r.sortOrder,
    value: r.value,
    label: r.label,
    isActive: r.isActive,
  };
}

export async function toConfigDTO(row: LeadFormSettings & {
  fields: LeadFormField[];
  sources: LeadFormSourceOption[];
}): Promise<LeadFormConfigDTO> {
  const sortedFields = [...row.fields].sort((a, b) => a.sortOrder - b.sortOrder);
  const sortedSources = [...row.sources].sort((a, b) => a.sortOrder - b.sortOrder);
  return {
    settingsId: row.id,
    fields: sortedFields.map(rowToFieldDTO),
    sources: sortedSources.map(rowToSourceDTO),
  };
}

async function seedDefaultSettings(tenantId: string): Promise<LeadFormConfigDTO> {
  const fieldRows = buildDefaultLeadFormFields();
  const srcRows = defaultLeadSources();

  const created = await prismaBase.$transaction(async (tx) => {
    const settings = await tx.leadFormSettings.create({
      data: { tenantId },
    });

    await tx.leadFormField.createMany({
      data: fieldRows.map((f) => ({
        id: randomUUID(),
        settingsId: settings.id,
        sortOrder: f.sortOrder,
        fieldKey: f.fieldKey,
        label: f.label,
        placeholder: f.placeholder,
        enabled: f.enabled,
        required: f.required,
        validation: f.validation ?? undefined,
      })),
    });

    await tx.leadFormSourceOption.createMany({
      data: srcRows.map((s) => ({
        id: randomUUID(),
        settingsId: settings.id,
        sortOrder: s.sortOrder,
        value: s.value,
        label: s.label,
        isActive: s.isActive,
      })),
    });

    return tx.leadFormSettings.findUniqueOrThrow({
      where: { id: settings.id },
      include: {
        fields: true,
        sources: true,
      },
    });
  });

  return toConfigDTO(created);
}

/** İlk açılışta varsayılan satırları oluşturur. */
export async function getLeadFormConfigForTenant(
  tenantId: string
): Promise<LeadFormConfigDTO> {
  const row = await prismaBase.leadFormSettings.findUnique({
    where: { tenantId },
    include: {
      fields: true,
      sources: true,
    },
  });

  if (!row) {
    return seedDefaultSettings(tenantId);
  }
  return toConfigDTO(row);
}

export async function replaceLeadFormConfig(params: {
  tenantId: string;
  fields: LeadFormFieldDTO[];
  sources: LeadFormSourceDTO[];
}): Promise<LeadFormConfigDTO> {
  const { tenantId, fields, sources } = params;

  const ensured = await prismaBase.leadFormSettings.upsert({
    where: { tenantId },
    create: { tenantId },
    update: {},
  });

  await prismaBase.$transaction([
    prismaBase.leadFormField.deleteMany({ where: { settingsId: ensured.id } }),
    prismaBase.leadFormSourceOption.deleteMany({ where: { settingsId: ensured.id } }),
  ]);

  const fieldCreates = [...fields].sort((a, b) => a.sortOrder - b.sortOrder);
  const sourceCreates = [...sources].sort((a, b) => a.sortOrder - b.sortOrder);

  await prismaBase.leadFormField.createMany({
    data: fieldCreates.map((f) => ({
      id: randomUUID(),
      settingsId: ensured.id,
      sortOrder: f.sortOrder,
      fieldKey: f.fieldKey,
      label: f.label,
      placeholder: f.placeholder ?? null,
      enabled: f.enabled,
      required: f.required,
      validation: f.validation ?? undefined,
    })),
  });

  await prismaBase.leadFormSourceOption.createMany({
    data: sourceCreates.map((s) => ({
      id: randomUUID(),
      settingsId: ensured.id,
      sortOrder: s.sortOrder,
      value: s.value,
      label: s.label,
      isActive: s.isActive,
    })),
  });

  const out = await prismaBase.leadFormSettings.findUniqueOrThrow({
    where: { id: ensured.id },
    include: { fields: true, sources: true },
  });
  return toConfigDTO(out);
}

/** PUT gövdesi doğrulama: tam alan kümesi + email/source açık kalmalı. */
export function assertLeadFormPutShape(fields: LeadFormFieldDTO[]): string | null {
  if (fields.length !== LEAD_FORM_FIELD_KEYS.length) return "INVALID_FIELD_COVERAGE";
  const keys = new Set(fields.map((f) => f.fieldKey));
  if (keys.size !== LEAD_FORM_FIELD_KEYS.length) return "FIELD_KEY_UNIQUENESS";

  for (const k of LEAD_FORM_FIELD_KEYS) {
    if (!keys.has(k)) return `MISSING:${k}`;
  }

  const email = fields.find((f) => f.fieldKey === "email");
  const source = fields.find((f) => f.fieldKey === "source");
  if (!email?.enabled || !source?.enabled) return "EMAIL_SOURCE_LOCKED";
  if (!email?.required) return "EMAIL_REQUIRED_LOCKED";

  return null;
}
