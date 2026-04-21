import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/api-context";
import { prismaBase } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { requireAuthorisingOfficer } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  try {
    const user = await getSessionUser();
    if (!requireAuthorisingOfficer(user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const tenants = await prismaBase.tenant.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { users: true, workers: true } },
      },
    });

    return NextResponse.json({ data: tenants });
  } catch (e) {
    logger.error("GET /api/admin/tenants failed", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
