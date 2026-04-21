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

    const levelRaw = req.nextUrl.searchParams.get("level")?.trim() || null;
    const validLevels: RiskLevel[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
    const level =
      levelRaw && validLevels.includes(levelRaw as RiskLevel)
        ? (levelRaw as RiskLevel)
        : null;

    return await withTenant(user, req, async () => {
      const rows = await prisma.riskScore.findMany({
        where: {
          isTenantAggregate: false,
          ...(level ? { level } : {}),
        },
        orderBy: [{ score: "desc" }, { calculatedAt: "desc" }],
        take: 500,
        include: {
          worker: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              employmentStatus: true,
            },
          },
        },
      });

      return NextResponse.json({ data: rows });
    });
  } catch (e) {
    logger.error("GET /api/risk-scores failed", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
