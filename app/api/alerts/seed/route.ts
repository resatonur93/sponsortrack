import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { seedTestAlertsForTenant } from "@/lib/notifications/seed-alerts";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/** POST — örnek Alert + NotificationEvent (tenant içi). LEVEL_2 dışı oturumlar. */
export async function POST(): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role === "LEVEL_2_USER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const result = await seedTestAlertsForTenant(session.user.tenantId);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Seed failed";
    logger.warn("POST /api/alerts/seed failed", { err: msg });
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
