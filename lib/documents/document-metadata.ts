import { z } from "zod";
import type { DocumentType } from "@prisma/client";

const optionalStr = z.string().optional().nullable();

export const passportMetadataSchema = z.object({
  country: optionalStr,
  number: optionalStr,
  issueDate: optionalStr,
  expiryDate: optionalStr,
  scanImage: optionalStr,
});

export const brpMetadataSchema = z.object({
  number: optionalStr,
  expiryDate: optionalStr,
  frontImage: optionalStr,
  backImage: optionalStr,
  shareCode: optionalStr,
});

export const evisaMetadataSchema = z.object({
  reference: optionalStr,
  validFrom: optionalStr,
  validUntil: optionalStr,
  status: optionalStr,
});

export const shareCodeMetadataSchema = z.object({
  code: optionalStr,
  generatedDate: optionalStr,
  result: optionalStr,
  rtwCheckDate: optionalStr,
});

export const atasMetadataSchema = z.object({
  certificateNumber: optionalStr,
  issueDate: optionalStr,
  expiryDate: optionalStr,
});

export const nmcMetadataSchema = z.object({
  registrationNumber: optionalStr,
  registrationDate: optionalStr,
  expiryDate: optionalStr,
});

export type PassportMeta = z.infer<typeof passportMetadataSchema>;
export type BrpMeta = z.infer<typeof brpMetadataSchema>;
export type EvisaMeta = z.infer<typeof evisaMetadataSchema>;
export type ShareCodeMeta = z.infer<typeof shareCodeMetadataSchema>;
export type AtasMeta = z.infer<typeof atasMetadataSchema>;
export type NmcMeta = z.infer<typeof nmcMetadataSchema>;

export function parseDocumentMetadata(
  documentType: DocumentType,
  raw: unknown
): Record<string, unknown> {
  if (raw == null || typeof raw !== "object") return {};
  const o = raw as Record<string, unknown>;
  switch (documentType) {
    case "PASSPORT": {
      const p = passportMetadataSchema.safeParse(o);
      return p.success ? { ...p.data } : {};
    }
    case "BRP": {
      const p = brpMetadataSchema.safeParse(o);
      return p.success ? { ...p.data } : {};
    }
    case "EVISA": {
      const p = evisaMetadataSchema.safeParse(o);
      return p.success ? { ...p.data } : {};
    }
    case "SHARE_CODE": {
      const p = shareCodeMetadataSchema.safeParse(o);
      return p.success ? { ...p.data } : {};
    }
    case "ATAS_CERTIFICATE": {
      const p = atasMetadataSchema.safeParse(o);
      return p.success ? { ...p.data } : {};
    }
    case "NMC_REGISTRATION": {
      const p = nmcMetadataSchema.safeParse(o);
      return p.success ? { ...p.data } : {};
    }
    default:
      return { ...o };
  }
}
