import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, withTenant } from "@/lib/api-context";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return await withTenant(user, req, async () => {
      const rows = await prisma.worker.findMany({
        where: { tenantId: user.tenantId },
        select: { cosReference: true },
        orderBy: { cosReference: "asc" },
      });
      const refs = Array.from(
        new Set(rows.map((r) => r.cosReference).filter(Boolean))
      );
      return NextResponse.json({ data: refs });
    });
  } catch (e) {
    logger.error("GET /api/workers/cos-references failed", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
