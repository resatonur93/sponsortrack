import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, withTenant } from "@/lib/api-context";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import type { AlertLevel, Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return await withTenant(user, req, async () => {
      const { searchParams } = new URL(req.url);
      const level = searchParams.get("level") as AlertLevel | null;
      const isReadParam = searchParams.get("isRead");
      const includeDismissed = searchParams.get("includeDismissed") === "true";
      const limit = Math.min(
        parseInt(searchParams.get("limit") ?? "100", 10) || 100,
        500
      );

      const where: Prisma.AlertWhereInput = {};
      if (level) where.level = level;
      if (isReadParam === "true") where.isRead = true;
      if (isReadParam === "false") where.isRead = false;
      if (!includeDismissed) where.dismissedAt = null;

      const [data, unreadCount] = await Promise.all([
        limit <= 0
          ? Promise.resolve([])
          : prisma.alert.findMany({
              where,
              orderBy: { createdAt: "desc" },
              take: limit,
              include: {
                worker: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                  },
                },
              },
            }),
        prisma.alert.count({
          where: {
            isRead: false,
            dismissedAt: null,
          },
        }),
      ]);

      const baseActive = { dismissedAt: null } as const;
      const [byLevel, byLevelUnread] = await Promise.all([
        Promise.all(
          (["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const).map(async (level) => ({
            level,
            count: await prisma.alert.count({ where: { ...baseActive, level } }),
          }))
        ),
        Promise.all(
          (["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const).map(async (level) => ({
            level,
            count: await prisma.alert.count({
              where: { ...baseActive, level, isRead: false },
            }),
          }))
        ),
      ]);

      return NextResponse.json({
        data,
        meta: {
          unreadCount,
          byLevel: Object.fromEntries(byLevel.map((x) => [x.level, x.count])),
          byLevelUnread: Object.fromEntries(
            byLevelUnread.map((x) => [x.level, x.count])
          ),
        },
      });
    });
  } catch (e) {
    logger.error("GET /api/alerts failed", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
