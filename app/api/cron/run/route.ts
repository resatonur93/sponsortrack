import { NextRequest, NextResponse } from "next/server";
import { runAlertsPipeline } from "@/lib/scheduler";
import { logger } from "@/lib/logger";
import { isCronRequestAuthorized } from "@/lib/security/cron-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    if (!isCronRequestAuthorized(req)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const result = await runAlertsPipeline(new Date());
    logger.info("cron run completed (daily + escalation)", result);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    logger.error("cron run failed", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
