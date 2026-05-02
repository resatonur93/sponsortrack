import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/api-context";
import { requireAuthorisingOfficer } from "@/lib/admin-auth";
import type { LeadFormFieldKey } from "@/lib/lead-form/field-keys";
import { LEAD_FORM_FIELD_KEYS, isLeadFormFieldKey } from "@/lib/lead-form/field-keys";
import {
  assertLeadFormPutShape,
  getLeadFormConfigForTenant,
  replaceLeadFormConfig,
} from "@/lib/lead-form/server-repository";
import type { LeadFormFieldDTO, LeadFormSourceDTO } from "@/lib/lead-form/types";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const validationJson = z
  .object({
    minLength: z.number().int().min(0).max(10000).optional(),
    maxLength: z.number().int().min(1).max(20000).optional(),
    pattern: z.string().max(500).nullable().optional(),
    enforceEmail: z.boolean().optional(),
    phoneIntl: z.boolean().optional(),
  })
  .strict()
  .partial()
  .nullable()
  .optional();

const fieldKeyZ = z
  .string()
  .refine((s): s is LeadFormFieldKey => isLeadFormFieldKey(s));

const fieldRowZ = z.object({
  fieldKey: fieldKeyZ,
  sortOrder: z.number().int().min(0).max(99),
  label: z.string().min(1).max(200),
  placeholder: z.string().max(500).nullable().optional(),
  enabled: z.boolean(),
  required: z.boolean(),
  validation: validationJson,
});

const sourceRowZ = z.object({
  sortOrder: z.number().int().min(0).max(499),
  value: z.string().min(1).max(80).regex(/^[a-z0-9_-]+$/i),
  label: z.string().min(1).max(200),
  isActive: z.boolean(),
});

const putBodyZ = z.object({
  fields: z.array(fieldRowZ).length(LEAD_FORM_FIELD_KEYS.length),
  sources: z.array(sourceRowZ).min(1).max(80),
});

function normalizeSlug(s: string): string {
  return s.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "_").replace(/^_|_$/g, "");
}

function validateUniqueValues(sources: { value: string }[]): string | null {
  const set = new Set<string>();
  for (const r of sources) {
    const v = normalizeSlug(r.value);
    if (set.has(v)) return "DUPLICATE_SOURCE";
    set.add(v);
  }
  return null;
}

export async function GET(): Promise<NextResponse> {
  try {
    const user = await getSessionUser();
    if (!requireAuthorisingOfficer(user)) {
      return NextResponse.json(
        { error: user ? "Forbidden" : "Unauthorized" },
        { status: user ? 403 : 401 }
      );
    }

    const data = await getLeadFormConfigForTenant(user.tenantId);
    return NextResponse.json({ data }, { status: 200 });
  } catch (e) {
    logger.error("GET /api/admin/lead-form-config failed", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest): Promise<NextResponse> {
  try {
    const user = await getSessionUser();
    if (!requireAuthorisingOfficer(user)) {
      return NextResponse.json(
        { error: user ? "Forbidden" : "Unauthorized" },
        { status: user ? 403 : 401 }
      );
    }

    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = putBodyZ.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const fieldsMapped: LeadFormFieldDTO[] = parsed.data.fields.map((f) => ({
      sortOrder: f.sortOrder,
      fieldKey: f.fieldKey,
      label: f.label.trim(),
      placeholder: f.placeholder?.trim() || null,
      enabled: f.enabled,
      required: f.required,
      validation: (f.validation ?? null) as LeadFormFieldDTO["validation"],
    }));

    const shapeErr = assertLeadFormPutShape(fieldsMapped);
    if (shapeErr) {
      return NextResponse.json({ error: shapeErr }, { status: 400 });
    }

    const sourcesNormalized: LeadFormSourceDTO[] = parsed.data.sources.map(
      (s) => ({
        sortOrder: s.sortOrder,
        value: normalizeSlug(s.value),
        label: s.label.trim(),
        isActive: s.isActive,
      })
    );

    if (
      sourcesNormalized.some(
        (s) =>
          !s.value.length ||
          !s.label.length ||
          !/^[a-z0-9_-]+$/.test(s.value)
      )
    ) {
      return NextResponse.json(
        { error: "SOURCE_ROW_INCOMPLETE_OR_INVALID_SLUG" },
        { status: 400 }
      );
    }
    if (!sourcesNormalized.some((s) => s.isActive)) {
      return NextResponse.json(
        { error: "SOURCE_AT_LEAST_ONE_ACTIVE" },
        { status: 400 }
      );
    }

    const dupSrc = validateUniqueValues(sourcesNormalized);
    if (dupSrc) {
      return NextResponse.json({ error: dupSrc }, { status: 400 });
    }

    const data = await replaceLeadFormConfig({
      tenantId: user.tenantId,
      fields: fieldsMapped,
      sources: sourcesNormalized,
    });

    return NextResponse.json({ data }, { status: 200 });
  } catch (e) {
    logger.error("PUT /api/admin/lead-form-config failed", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
