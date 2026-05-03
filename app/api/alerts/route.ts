import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, withTenant } from "@/lib/api-context";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import type { AlertLevel, Prisma } from "@prisma/client";
import { dedupeAlertsByWorkerAndType } from "@/lib/alerts/dedupe-display";

export const dynamic = "force-dynamic";

const LEVEL_ORDER: AlertLevel[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
const DISPLAY_FETCH_CAP = 800;

/** Seed / örnek uyarıları gizler (`includeSynthetic=true` ile açılabilir). */
function excludeSyntheticAlerts(): Prisma.AlertWhereInput {
  return {
    NOT: {
      OR: [
        { dedupeKey: { startsWith: "seed:" } },
        { message: { contains: "örnek uyarı", mode: "insensitive" } },
      ],
    },
  };
}

/** Liste: `Alert` (tenant-scope). Cron üretimi `NotificationEvent` → escalation ile buraya yansır; NE doğrudan okunmaz. */
function omitLevel(where: Prisma.AlertWhereInput): Prisma.AlertWhereInput {
  const { level: _drop, ...rest } = where as Prisma.AlertWhereInput & {
    level?: Prisma.AlertWhereInput["level"];
  };
  return rest;
}

const workerInclude = {
  worker: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  },
} as const;

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
      const includeSynthetic = searchParams.get("includeSynthetic") === "true";
      const dedupeOff = searchParams.get("dedupe") === "none";
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

      const mergedWhere: Prisma.AlertWhereInput = includeSynthetic
        ? where
        : { AND: [where, excludeSyntheticAlerts()] };

      const whereNoLevel = omitLevel(mergedWhere);
      const readTrueOnly =
        typeof mergedWhere.isRead === "boolean" && mergedWhere.isRead === true;

      const useDedupedRollup = !dedupeOff && limit > 0;

      if (useDedupedRollup) {
        const raw = await prisma.alert.findMany({
          where: mergedWhere,
          orderBy: { createdAt: "desc" },
          take: DISPLAY_FETCH_CAP,
          include: workerInclude,
        });
        const pool = dedupeAlertsByWorkerAndType(raw);
        const data = pool.slice(0, limit);
        const unreadCount = readTrueOnly
          ? 0
          : pool.filter((r) => !r.isRead).length;

        const byLevelRecord = Object.fromEntries(
          LEVEL_ORDER.map((lv) => [
            lv,
            pool.filter((r) => r.level === lv).length,
          ])
        );

        const byLevelUnreadRecord = Object.fromEntries(
          LEVEL_ORDER.map((lv) => [
            lv,
            pool.filter((r) => r.level === lv && !r.isRead).length,
          ])
        );

        const totalActive = LEVEL_ORDER.reduce(
          (acc, lv) => acc + byLevelRecord[lv],
          0
        );

        return NextResponse.json({
          data,
          meta: {
            unreadCount,
            totalActive,
            byLevel: byLevelRecord,
            byLevelUnread: byLevelUnreadRecord,
            dedupe: "worker-type" as const,
            displayFetchCapReached: raw.length >= DISPLAY_FETCH_CAP,
          },
        });
      }

      const [data, byLevelAll, byLevelUnreadGroups] = await Promise.all([
        limit <= 0
          ? Promise.resolve([])
          : prisma.alert.findMany({
              where: mergedWhere,
              orderBy: { createdAt: "desc" },
              take: limit,
              include: workerInclude,
            }),
        prisma.alert.groupBy({
          by: ["level"],
          where: whereNoLevel,
          _count: { _all: true },
        }),
        readTrueOnly
          ? Promise.resolve([] as { level: AlertLevel; _count: { _all: number } }[])
          : prisma.alert.groupBy({
              by: ["level"],
              where: { ...whereNoLevel, isRead: false },
              _count: { _all: true },
            }),
      ]);

      const byLevelRecord = Object.fromEntries(
        LEVEL_ORDER.map((lv) => [lv, 0])
      ) as Record<AlertLevel, number>;
      for (const g of byLevelAll) byLevelRecord[g.level] = g._count._all;

      const byLevelUnreadRecord = Object.fromEntries(
        LEVEL_ORDER.map((lv) => [lv, 0])
      ) as Record<AlertLevel, number>;
      for (const g of byLevelUnreadGroups) byLevelUnreadRecord[g.level] = g._count._all;

      const unreadCount = readTrueOnly
        ? 0
        : LEVEL_ORDER.reduce((acc, lv) => acc + byLevelUnreadRecord[lv], 0);

      return NextResponse.json({
        data,
        meta: {
          unreadCount,
          totalActive: LEVEL_ORDER.reduce((acc, lv) => acc + byLevelRecord[lv], 0),
          byLevel: byLevelRecord,
          byLevelUnread: byLevelUnreadRecord,
          dedupe: null,
          displayFetchCapReached: false,
        },
      });
    });
  } catch (e) {
    logger.error("GET /api/alerts failed", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
