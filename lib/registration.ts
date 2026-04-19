import { timingSafeEqual } from "node:crypto";
import { z } from "zod";

export const setupBodySchema = z.object({
  companyName: z.string().trim().min(1, "Şirket adı gerekli"),
  licenceNumber: z.string().trim().min(1, "Lisans numarası gerekli"),
  address: z.string().trim().optional(),
  firstName: z.string().trim().min(1, "Ad gerekli"),
  lastName: z.string().trim().min(1, "Soyad gerekli"),
  email: z.string().trim().email("Geçerli e-posta girin"),
  password: z.string().min(8, "Şifre en az 8 karakter olmalı"),
});

export const registerBodySchema = setupBodySchema.extend({
  registrationSecret: z.string().min(1, "Kayıt anahtarı gerekli"),
});

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function timingSafeEqualStrings(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) {
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}
