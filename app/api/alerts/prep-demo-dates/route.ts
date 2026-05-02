import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prepWorkersForAlertsDemo } from "@/lib/dev/prep-workers-for-alerts-demo";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/** POST — vize / sponsorluk / RTW tarihlerini yakın geleceğe çeker (yalnızca oturum, LEVEL_2 hariç). */
export async function POST(): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId || !session.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role === "LEVEL_2_USER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const result = await prepWorkersForAlertsDemo(session.user.tenantId, session.user.id, {
      maxWorkers: 3,
    });
    logger.info("POST /api/alerts/prep-demo-dates", {
      tenantId: session.user.tenantId,
      ...result,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Prep failed";
    logger.warn("POST /api/alerts/prep-demo-dates failed", { err: msg });
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
