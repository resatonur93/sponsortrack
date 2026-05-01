import type { PrismaTenantClient } from "@/lib/prisma";
import { computeTrafficDashboard } from "./traffic-light";
import type { DashboardSummary } from "./types";

/**
 * Tenant kapsamlı Prisma ile uyum özeti (`withTenant` içinde kullanın).
 */
export async function getComplianceDashboardSummary(
  db: PrismaTenantClient,
  now: Date = new Date()
): Promise<DashboardSummary> {
  return computeTrafficDashboard(db, now);
}
