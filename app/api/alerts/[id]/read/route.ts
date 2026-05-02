import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, withTenant } from "@/lib/api-context";
import { prismaBase } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

const WORKER_PREVIEW = {
  select: {
    id: true,
    firstName: true,
    lastName: true,
    email: true,
  },
} as const;

/**
 * Tenant-scoped `prisma` client ext. hook’ları bu uçta atlanır: üretimde görülen 500’ler
 * çoğu zaman güncelleme + audit/extension etkileşiminden çıkabiliyor. Burada yalnızca
 * `tenantId` ile doğrulanmış doğrudan sorgular kullanılır.
 */
export async function PUT(
  req: NextRequest,
  { params }: Params
): Promise<NextResponse> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return await withTenant(user, req, async () => {
      const tenantId = user.tenantId;
      const alertId = params.id;

      const existing = await prismaBase.alert.findFirst({
        where: { id: alertId, tenantId },
      });
      if (!existing) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      if (!existing.isRead) {
        await prismaBase.alert.update({
          where: { id: alertId },
          data: { isRead: true },
        });
      }

      const refreshed = await prismaBase.alert.findFirst({
        where: { id: alertId, tenantId },
        include: {
          worker: WORKER_PREVIEW,
        },
      });

      return NextResponse.json({ data: refreshed });
    });
  } catch (e) {
    logger.error("PUT /api/alerts/[id]/read failed", e);
    const msg =
      process.env.NODE_ENV === "development" && e instanceof Error
        ? e.message
        : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
