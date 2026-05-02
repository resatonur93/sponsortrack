import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/api-context";
import { logger } from "@/lib/logger";
import { requireAuthorisingOfficer } from "@/lib/admin-auth";
import { buildAdminDashboardPayload } from "@/lib/admin/dashboard";

export const dynamic = "force-dynamic";

/** @deprecated Prefer `GET /api/admin/dashboard` — same payload. */
export async function GET(): Promise<NextResponse> {
  try {
    const user = await getSessionUser();
    if (!requireAuthorisingOfficer(user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const data = await buildAdminDashboardPayload();
    return NextResponse.json({ data });
  } catch (e) {
    logger.error("GET /api/admin/stats failed", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
