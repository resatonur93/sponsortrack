import { NextRequest, NextResponse } from "next/server";
import { runRiskScoringAllTenants } from "@/lib/scheduler";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/** Daily 02:00 — Authorization: Bearer CRON_SECRET veya ?token= */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const secret = process.env.CRON_SECRET;
    const header = req.headers.get("authorization");
    const token = header?.startsWith("Bearer ")
      ? header.slice(7)
      : req.nextUrl.searchParams.get("token");
    if (!secret || token !== secret) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const result = await runRiskScoringAllTenants();
    logger.info("risk-scores cron completed", result);
    return NextResponse.json({ ok: true, result });
  } catch (e) {
    logger.error("risk-scores cron failed", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
