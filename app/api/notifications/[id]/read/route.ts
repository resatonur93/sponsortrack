import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, withTenant } from "@/lib/api-context";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { markNotificationAsRead } from "@/lib/notifications/notification-actions";

export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

export async function PUT(
  _req: NextRequest,
  { params }: Params
): Promise<NextResponse> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return await withTenant(user, _req, async () => {
      const result = await markNotificationAsRead({
        notificationId: params.id,
      });
      if (!result.ok) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      const full = await prisma.notificationEvent.findUnique({
        where: { id: params.id },
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
      });
      return NextResponse.json({ data: full });
    });
  } catch (e) {
    logger.error("PUT /api/notifications/[id]/read failed", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
