import { z } from "zod";
import { LeadStatus } from "@prisma/client";

export const createLeadBodySchema = z.object({
  email: z.string().trim().email(),
  companyName: z.string().trim().min(1, "Şirket adı gerekli"),
  name: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  message: z.string().trim().optional(),
  source: z.string().trim().min(1).max(64).default("demo_request"),
});

export type CreateLeadInput = z.infer<typeof createLeadBodySchema>;

export const adminLeadUpdateSchema = z.object({
  status: z.nativeEnum(LeadStatus).optional(),
  notes: z.string().max(20000).optional().nullable(),
  assignedTo: z.string().cuid().optional().nullable(),
});

export const convertLeadBodySchema = z.object({
  licenceNumber: z.string().trim().min(3).max(128),
  password: z.string().min(8).max(128),
});

export function normalizeLeadEmail(email: string): string {
  return email.trim().toLowerCase();
}
