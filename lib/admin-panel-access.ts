function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function resolvedAdminEmail(): string | null {
  const raw = process.env.ADMIN_PANEL_EMAIL;
  if (!raw?.trim()) return null;
  return normalizeEmail(raw);
}

/**
 * Admin paneli e-posta adresini döner.
 * ADMIN_PANEL_EMAIL tanımlı değilse hata fırlatır — yalnızca admin sayfası bileşenlerinden çağır.
 */
export function getAdminPanelEmail(): string {
  const email = resolvedAdminEmail();
  if (!email) {
    throw new Error(
      "ADMIN_PANEL_EMAIL environment variable is required but not set"
    );
  }
  return email;
}

export function canAccessAdminPanel(
  email: string | null | undefined,
  role: string | undefined
): boolean {
  if (role !== "AUTHORISING_OFFICER") return false;
  if (!email) return false;
  const adminEmail = resolvedAdminEmail();
  if (!adminEmail) return false; // env tanımlı değilse admin erişimi yok
  return normalizeEmail(email) === adminEmail;
}
