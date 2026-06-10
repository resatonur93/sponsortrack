import { NextRequest, NextResponse } from "next/server";
import { runEscalationAlertsCron } from "@/lib/scheduler";
import { logger } from "@/lib/logger";
import { isCronRequestAuthorized } from "@/lib/security/cron-auth";

export const dynamic = "force-dynamic";

/** Saatlik escalation (cron): Authorization: Bearer CRON_SECRET veya ?token= */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    if (!isCronRequestAuthorized(req)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const result = await runEscalationAlertsCron(new Date());
    logger.info("escalation cron completed", result);
    return NextResponse.json({ ok: true, result });
  } catch (e) {
    logger.error("escalation cron failed", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
