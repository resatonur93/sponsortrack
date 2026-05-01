import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, withTenant } from "@/lib/api-context";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { runRiskScoringForTenant } from "@/lib/scheduler";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

export async function GET(
  req: NextRequest,
  { params }: Params
): Promise<NextResponse> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const refresh = req.nextUrl.searchParams.get("refresh") === "1";

    return await withTenant(user, req, async () => {
      const worker = await prisma.worker.findFirst({
        where: { id: params.id },
        select: { id: true },
      });
      if (!worker) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      if (refresh) {
        if (user.role === Role.LEVEL_2_USER) {
          return NextResponse.json(
            { error: "Recalculation not allowed for read-only role" },
            { status: 403 }
          );
        }
        await runRiskScoringForTenant(user.tenantId);
      }

      const row = await prisma.riskScore.findFirst({
        where: {
          workerId: params.id,
          isTenantAggregate: false,
        },
        orderBy: { calculatedAt: "desc" },
      });

      if (!row) {
        return NextResponse.json({
          data: null,
          message:
            "No score yet — run nightly cron or ?refresh=1 to calculate.",
        });
      }

      return NextResponse.json({ data: row });
    });
  } catch (e) {
    logger.error("GET /api/workers/[id]/risk-score failed", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
