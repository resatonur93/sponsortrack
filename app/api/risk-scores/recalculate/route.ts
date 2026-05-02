import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, withTenant } from "@/lib/api-context";
import { logger } from "@/lib/logger";
import { runRiskScoringForTenant } from "@/lib/scheduler";

export const dynamic = "force-dynamic";

/** Recalculate risk scores for the signed-in user's tenant (session auth). */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return await withTenant(user, req, async () => {
      const result = await runRiskScoringForTenant(user.tenantId);
      return NextResponse.json({ ok: true, workersProcessed: result.workers });
    });
  } catch (e) {
    logger.error("POST /api/risk-scores/recalculate failed", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
