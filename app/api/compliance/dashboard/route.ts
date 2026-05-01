import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, withTenant } from "@/lib/api-context";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { buildFullDashboard } from "@/lib/dashboard-response";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return await withTenant(user, req, async () => {
      const data = await buildFullDashboard(prisma, user.tenantId, new Date());
      return NextResponse.json(
        { data },
        {
          headers: {
            "Cache-Control": "private, no-store, max-age=0, must-revalidate",
          },
        }
      );
    });
  } catch (error) {
    logger.error("GET /api/compliance/dashboard failed", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
