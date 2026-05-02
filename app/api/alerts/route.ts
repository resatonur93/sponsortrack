import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, withTenant } from "@/lib/api-context";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import type { AlertLevel, Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * Liste kaynağı: `Alert` (tenant Prisma extension ile otomatik filtre).
 * Satırlar `runEscalationAlertsCron` ile üretilir; `NotificationEvent` doğrudan bu endpoint’ten okunmaz
 * (olaylar günlük cron’da upsert edilir, escalation ile uyarıya yansır).
 */
function omitLevel(where: Prisma.AlertWhereInput): Prisma.AlertWhereInput {
  const { level: _drop, ...rest } = where as Prisma.AlertWhereInput & {
    level?: Prisma.AlertWhereInput["level"];
  };
  return rest;
}

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
      const fromParam = searchParams.get("from");
      const toParam = searchParams.get("to");
      const limit = Math.min(
        parseInt(searchParams.get("limit") ?? "100", 10) || 100,
        500
      );

      const where: Prisma.AlertWhereInput = {};
      if (level) where.level = level;
      if (isReadParam === "true") where.isRead = true;
      if (isReadParam === "false") where.isRead = false;
      if (!includeDismissed) where.dismissedAt = null;

      if (fromParam?.trim() || toParam?.trim()) {
        const createdAt: Prisma.DateTimeFilter = {};
        if (fromParam?.trim()) {
          const d = new Date(`${fromParam.trim()}T00:00:00.000`);
          if (!Number.isNaN(d.getTime())) createdAt.gte = d;
        }
        if (toParam?.trim()) {
          const d = new Date(`${toParam.trim()}T23:59:59.999`);
          if (!Number.isNaN(d.getTime())) createdAt.lte = d;
        }
        if (Object.keys(createdAt).length > 0) {
          where.createdAt = createdAt;
        }
      }

      const whereScoped = where;
      const whereNoLevel = omitLevel(whereScoped);
      const readTrueOnly =
        typeof whereScoped.isRead === "boolean" && whereScoped.isRead === true;

      const [data, unreadCount, byLevel, byLevelUnread] = await Promise.all([
        limit <= 0
          ? Promise.resolve([])
          : prisma.alert.findMany({
              where: whereScoped,
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
        readTrueOnly
          ? Promise.resolve(0)
          : prisma.alert.count({
              where: {
                ...whereNoLevel,
                isRead: false,
              },
            }),
        Promise.all(
          (["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const).map(async (level) => ({
            level,
            count: await prisma.alert.count({
              where: { ...whereNoLevel, level },
            }),
          }))
        ),
        readTrueOnly
          ? Promise.resolve(
              (["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const).map((level) => ({
                level,
                count: 0,
              }))
            )
          : Promise.all(
              (["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const).map(async (level) => ({
                level,
                count: await prisma.alert.count({
                  where: { ...whereNoLevel, level, isRead: false },
                }),
              }))
            ),
      ]);

      const byLevelRecord = Object.fromEntries(
        byLevel.map((x) => [x.level, x.count])
      );

      return NextResponse.json({
        data,
        meta: {
          unreadCount,
          totalActive: byLevel.reduce((acc, x) => acc + x.count, 0),
          byLevel: byLevelRecord,
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
