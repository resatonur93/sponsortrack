import { NextRequest, NextResponse } from "next/server";
import type { RiskLevel } from "@prisma/client";
import { getSessionUser, withTenant } from "@/lib/api-context";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return await withTenant(user, req, async () => {
      const [grouped, orgRow, latestWorker] = await Promise.all([
        prisma.riskScore.groupBy({
          by: ["level"],
          where: { isTenantAggregate: false },
          _count: { _all: true },
        }),
        prisma.riskScore.findFirst({
          where: { isTenantAggregate: true },
          orderBy: { calculatedAt: "desc" },
        }),
        prisma.riskScore.findFirst({
          where: { isTenantAggregate: false },
          orderBy: { calculatedAt: "desc" },
          select: { calculatedAt: true },
        }),
      ]);

      const byLevel: Record<RiskLevel, number> = {
        LOW: 0,
        MEDIUM: 0,
        HIGH: 0,
        CRITICAL: 0,
      };
      for (const g of grouped) {
        byLevel[g.level] = g._count._all;
      }

      const workerScores = await prisma.riskScore.count({
        where: { isTenantAggregate: false },
      });

      return NextResponse.json({
        data: {
          byLevel,
          workerScores,
          organisation: orgRow,
          lastCalculatedAt:
            latestWorker?.calculatedAt ?? orgRow?.calculatedAt ?? null,
        },
      });
    });
  } catch (e) {
    logger.error("GET /api/risk-scores/summary failed", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
