import { NextRequest, NextResponse } from "next/server";
import { runAlertsPipeline } from "@/lib/scheduler";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

function cronAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  const header = req.headers.get("authorization");
  const token = header?.startsWith("Bearer ")
    ? header.slice(7)
    : req.nextUrl.searchParams.get("token");
  return !!(secret && token === secret);
}

/**
 * Günlük bildirim üretimi + escalation → `Alert` tablosu.
 * Her iki method da CRON_SECRET gerektirir.
 * Manuel tetikleme: `curl -X POST -H "Authorization: Bearer $CRON_SECRET" /api/cron/process-alerts`
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!cronAuthorized(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const result = await runAlertsPipeline(new Date());
    logger.info("GET /api/cron/process-alerts completed", {
      escalationUpserts: result.escalation.upserts,
      visaEvents: result.daily.visaEventsCreated,
    });
    return NextResponse.json({ ok: true, result });
  } catch (e) {
    logger.error("GET /api/cron/process-alerts failed", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!cronAuthorized(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const result = await runAlertsPipeline(new Date());
    logger.info("POST /api/cron/process-alerts completed", {
      by: "cron_secret",
      escalationUpserts: result.escalation.upserts,
    });
    return NextResponse.json({ ok: true, result });
  } catch (e) {
    logger.error("POST /api/cron/process-alerts failed", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
