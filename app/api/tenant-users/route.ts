import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, withTenant } from "@/lib/api-context";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { parsePageAccessOverrides } from "@/lib/authorization/page-access";

export const dynamic = "force-dynamic";

/** Aynı kiracıdaki kullanıcılar (ör. çalışan line manager seçimi, kullanıcı yönetimi). */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const includeInactive = req.nextUrl.searchParams.get("includeInactive") === "true";
    return await withTenant(user, req, async () => {
      const [rows, lastSessions] = await Promise.all([
        prisma.user.findMany({
          where: includeInactive
            ? { tenantId: user.tenantId }
            : { tenantId: user.tenantId, isActive: true },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            isActive: true,
            createdAt: true,
            pageAccessOverrides: true,
          },
          orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        }),
        prisma.userAuthSession.groupBy({
          by: ["userId"],
          where: { tenantId: user.tenantId },
          _max: { lastSeenAt: true },
        }),
      ]);
      const lastActiveByUser = new Map(
        lastSessions.map((s) => [s.userId, s._max.lastSeenAt])
      );
      const data = rows.map((r) => ({
        ...r,
        pageAccessOverrides: parsePageAccessOverrides(r.pageAccessOverrides),
        lastActiveAt: lastActiveByUser.get(r.id)?.toISOString() ?? null,
      }));
      return NextResponse.json({ data });
    });
  } catch (e) {
    logger.error("GET /api/tenant-users failed", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
