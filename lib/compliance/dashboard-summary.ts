import { getTenantContext } from "@/lib/tenant-context";
import type { PrismaTenantClient } from "@/lib/prisma";
import { computeTrafficDashboard } from "./traffic-light";
import type { DashboardSummary } from "./types";

/**
 * Kart verileri + kişi bazında gruplanmış detay (`aggregateItems`).
 * `withTenant` / `runWithTenantContext` içinde çağrılmalı; `tenantId` oturumdaki kiracı ile eşleşmelidir.
 */
export async function getComplianceDashboardSummary(
  tenantId: string,
  db: PrismaTenantClient,
  now: Date = new Date()
): Promise<DashboardSummary> {
  const ctx = getTenantContext();
  if (!ctx || ctx.tenantId !== tenantId) {
    throw new Error(
      "getComplianceDashboardSummary: tenantId eşleşmiyor veya tenant bağlamı yok (withTenant kullanın)."
    );
  }
  return computeTrafficDashboard(db, now);
}
