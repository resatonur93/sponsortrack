import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, withTenant } from "@/lib/api-context";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/** Aynı kiracıdaki kullanıcılar (ör. çalışan line manager seçimi). */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return await withTenant(user, req, async () => {
      const rows = await prisma.user.findMany({
        where: { tenantId: user.tenantId, isActive: true },
        select: { id: true, firstName: true, lastName: true, email: true },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      });
      return NextResponse.json({ data: rows });
    });
  } catch (e) {
    logger.error("GET /api/tenant-users failed", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
