function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function resolvedAdminEmail(): string {
  const raw = process.env.ADMIN_PANEL_EMAIL ?? "resatonurkurt@gmail.com";
  return normalizeEmail(raw);
}

/** Tek hesap: bu e-posta + AUTHORISING_OFFICER rolü = /admin erişimi */
export function getAdminPanelEmail(): string {
  return resolvedAdminEmail();
}

export function canAccessAdminPanel(
  email: string | null | undefined,
  role: string | undefined
): boolean {
  if (role !== "AUTHORISING_OFFICER") return false;
  if (!email) return false;
  return normalizeEmail(email) === resolvedAdminEmail();
}
