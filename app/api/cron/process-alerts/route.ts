import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { runAlertsPipeline } from "@/lib/scheduler";
import { logger } from "@/lib/logger";
import { getSessionUser } from "@/lib/api-context";

export const dynamic = "force-dynamic";

function cronSecretAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  const header = req.headers.get("authorization");
  const token = header?.startsWith("Bearer ")
    ? header.slice(7)
    : req.nextUrl.searchParams.get("token");
  return !!(secret && token === secret);
}

/**
 * Günlük bildirim üretimi + escalation → `Alert` tablosu.
 * GET: yalnızca CRON_SECRET (Vercel Cron çağrısı).
 * Manuel tetikleme: `curl -X POST -H "Authorization: Bearer $CRON_SECRET" /api/cron/process-alerts`
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!cronSecretAuthorized(req)) {
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

/**
 * POST: CRON_SECRET veya oturum açmış, salt-okunur olmayan bir kullanıcı
 * (Uyarılar sayfasındaki "Uyarıları şimdi hesapla" geliştirme butonu için).
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const bySecret = cronSecretAuthorized(req);
  const sessionUser = bySecret ? null : await getSessionUser(req.headers);
  if (!bySecret && (!sessionUser || sessionUser.role === Role.LEVEL_2_USER)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const result = await runAlertsPipeline(new Date());
    logger.info("POST /api/cron/process-alerts completed", {
      by: bySecret ? "cron_secret" : "session",
      escalationUpserts: result.escalation.upserts,
    });
    return NextResponse.json({ ok: true, result });
  } catch (e) {
    logger.error("POST /api/cron/process-alerts failed", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
