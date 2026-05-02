import { NextRequest, NextResponse } from "next/server";
import { runAlertsPipeline } from "@/lib/scheduler";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

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
