/**
 * Sayfa bazlı erişim istisnaları — 4 sabit rolün üstüne, tek tek kullanıcılar için
 * belirli sayfaları kapatabilme. Varsayılan: her sayfa erişilebilir; sadece açıkça
 * `false` yapılmış anahtarlar erişimi kapatır.
 */
export const TENANT_NAV_PAGE_KEYS = [
  "dashboard",
  "workers",
  "vacancies",
  "events",
  "alerts",
  "notifications",
  "policies",
  "compliance",
  "audit",
  "riskReport",
  "orgChanges",
] as const;

export type TenantNavPageKey = (typeof TENANT_NAV_PAGE_KEYS)[number];

export type PageAccessOverrides = Partial<Record<TenantNavPageKey, boolean>>;

const PAGE_KEY_SET = new Set<string>(TENANT_NAV_PAGE_KEYS);

/** Bilinmeyen anahtarları ve yanlış tipteki değerleri sessizce eler — bozuk/eski veri patlatmaz. */
export function parsePageAccessOverrides(value: unknown): PageAccessOverrides {
  if (!value || typeof value !== "object") return {};
  const out: PageAccessOverrides = {};
  for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
    if (PAGE_KEY_SET.has(key) && typeof v === "boolean") {
      out[key as TenantNavPageKey] = v;
    }
  }
  return out;
}

/** Yalnızca açıkça `false` olan bir sayfa erişimi kapatır; her şey varsayılan olarak açıktır. */
export function canAccessPage(
  overrides: PageAccessOverrides,
  key: TenantNavPageKey
): boolean {
  return overrides[key] !== false;
}

/** Route → nav anahtarı eşlemesi; middleware ve API'lerde ortak kullanılır. */
export const ROUTE_PAGE_KEY: readonly { prefix: string; key: TenantNavPageKey }[] = [
  { prefix: "/dashboard", key: "dashboard" },
  { prefix: "/vacancies", key: "vacancies" },
  { prefix: "/workers", key: "workers" },
  { prefix: "/events", key: "events" },
  { prefix: "/alerts", key: "alerts" },
  { prefix: "/notifications", key: "notifications" },
  { prefix: "/policies", key: "policies" },
  { prefix: "/compliance", key: "compliance" },
  { prefix: "/audit", key: "audit" },
  { prefix: "/risk-report", key: "riskReport" },
  { prefix: "/organisation-changes", key: "orgChanges" },
];

/** Verilen path için hangi nav anahtarının denetleneceğini bulur — eşleşme yoksa null (kısıtlanmaz). */
export function resolveNavKeyForPath(pathname: string): TenantNavPageKey | null {
  const match = ROUTE_PAGE_KEY.find(
    (r) => pathname === r.prefix || pathname.startsWith(`${r.prefix}/`)
  );
  return match?.key ?? null;
}
