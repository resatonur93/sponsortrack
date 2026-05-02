import { LeadStatus } from "@prisma/client";
import { prismaBase } from "@/lib/prisma";
import type { AdminDashboardPayload, AdminDashboardRecentLead } from "./dashboard-types";

export type { AdminDashboardPayload, AdminDashboardRecentLead } from "./dashboard-types";
export { ADMIN_LEAD_STATUS_CHART_COLORS } from "./chart-colors";

/** Full 30-day UTC series including zero-fill for gaps (for line charts). */
export function buildLeadsLast30DaySeries(trendCounts: Record<string, number>): {
  date: string;
  count: number;
}[] {
  const out: { date: string; count: number }[] = [];
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    out.push({ date: key, count: trendCounts[key] ?? 0 });
  }
  return out;
}

/** Aggregates for admin home / lead ops overview (AUTHORISING_OFFICER). */
export async function buildAdminDashboardPayload(): Promise<AdminDashboardPayload> {
  const baseWhere = { isDeleted: false };

  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const since30 = new Date();
  since30.setDate(since30.getDate() - 30);
  since30.setUTCHours(0, 0, 0, 0);

  const [
    totalLeads,
    newLeadsToday,
    convertedCount,
    byStatus,
    bySource,
    trendRows,
    recentRows,
  ] = await Promise.all([
    prismaBase.lead.count({ where: baseWhere }),
    prismaBase.lead.count({
      where: { ...baseWhere, createdAt: { gte: todayStart } },
    }),
    prismaBase.lead.count({
      where: { ...baseWhere, status: LeadStatus.CONVERTED },
    }),
    prismaBase.lead.groupBy({
      by: ["status"],
      where: baseWhere,
      _count: { _all: true },
    }),
    prismaBase.lead.groupBy({
      by: ["source"],
      where: baseWhere,
      _count: { _all: true },
    }),
    prismaBase.lead.findMany({
      where: { ...baseWhere, createdAt: { gte: since30 } },
      select: { createdAt: true },
    }),
    prismaBase.lead.findMany({
      where: baseWhere,
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        email: true,
        companyName: true,
        name: true,
        status: true,
        source: true,
        createdAt: true,
        activities: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { type: true, message: true, createdAt: true },
        },
      },
    }),
  ]);

  const conversionRate =
    totalLeads === 0 ? 0 : Math.round((convertedCount / totalLeads) * 1000) / 10;

  const trendMap: Record<string, number> = {};
  for (const r of trendRows) {
    const k = r.createdAt.toISOString().slice(0, 10);
    trendMap[k] = (trendMap[k] ?? 0) + 1;
  }
  const leadsByDay = buildLeadsLast30DaySeries(trendMap);

  const recentLeads: AdminDashboardRecentLead[] = recentRows.map((r) => {
    const act = r.activities[0];
    return {
      id: r.id,
      email: r.email,
      companyName: r.companyName,
      name: r.name,
      status: r.status,
      source: r.source,
      createdAt: r.createdAt.toISOString(),
      lastAction: act
        ? {
            type: act.type,
            summary: act.message?.trim() || act.type,
            at: act.createdAt.toISOString(),
          }
        : null,
    };
  });

  return {
    totalLeads,
    newLeadsToday,
    conversionRate,
    convertedCount,
    distinctSourceCount: bySource.length,
    leadsByStatus: byStatus.map((row) => ({
      status: row.status,
      count: row._count._all,
    })),
    leadsBySource: bySource.map((row) => ({
      source: row.source,
      count: row._count._all,
    })),
    leadsByDay,
    recentLeads,
  };
}
