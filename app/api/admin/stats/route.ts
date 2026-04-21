import { NextResponse } from "next/server";
import { LeadStatus } from "@prisma/client";
import { getSessionUser } from "@/lib/api-context";
import { prismaBase } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { requireAuthorisingOfficer } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  try {
    const user = await getSessionUser();
    if (!requireAuthorisingOfficer(user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

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
    const leadsByDay = Object.entries(trendMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));

    return NextResponse.json({
      data: {
        totalLeads,
        newLeadsToday,
        conversionRate,
        leadsByStatus: byStatus.map((r) => ({
          status: r.status,
          count: r._count._all,
        })),
        leadsBySource: bySource.map((r) => ({
          source: r.source,
          count: r._count._all,
        })),
        leadsByDay,
        recentActivity: recentRows,
      },
    });
  } catch (e) {
    logger.error("GET /api/admin/stats failed", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
