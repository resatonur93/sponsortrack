import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, withTenant } from "@/lib/api-context";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { markNotificationAsRead } from "@/lib/notifications/notification-actions";

export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

async function handleMarkRead(
  user: NonNullable<Awaited<ReturnType<typeof getSessionUser>>>,
  req: NextRequest,
  id: string
): Promise<NextResponse> {
  return await withTenant(user, req, async () => {
    const result = await markNotificationAsRead({
      notificationId: id,
    });
    if (!result.ok) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const full = await prisma.notificationEvent.findUnique({
      where: { id },
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
    if (!full) {
      return NextResponse.json(
        { error: "Not found after update" },
        { status: 404 }
      );
    }
    return NextResponse.json({ data: full });
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: Params
): Promise<NextResponse> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return await handleMarkRead(user, req, params.id);
  } catch (e) {
    logger.error("PATCH /api/notifications/[id]/read failed", e);
    const msg = e instanceof Error ? e.message : String(e);
    const isSchema =
      /readAt|column|does not exist|Unknown arg/i.test(msg) ||
      (e as { code?: string })?.code === "P2022";
    return NextResponse.json(
      {
        error: isSchema
          ? "Database schema out of date: run prisma migrate deploy (NotificationEvent.readAt)."
          : "Internal server error",
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: Params
): Promise<NextResponse> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return await handleMarkRead(user, req, params.id);
  } catch (e) {
    logger.error("PUT /api/notifications/[id]/read failed", e);
    const msg = e instanceof Error ? e.message : String(e);
    const isSchema =
      /readAt|column|does not exist|Unknown arg/i.test(msg) ||
      (e as { code?: string })?.code === "P2022";
    return NextResponse.json(
      {
        error: isSchema
          ? "Database schema out of date: run prisma migrate deploy (NotificationEvent.readAt)."
          : "Internal server error",
      },
      { status: 500 }
    );
  }
}

/** Bazı ortamlarda PUT kısıtlı olabildiği için POST ile aynı işlem. */
export async function POST(
  req: NextRequest,
  { params }: Params
): Promise<NextResponse> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return await handleMarkRead(user, req, params.id);
  } catch (e) {
    logger.error("POST /api/notifications/[id]/read failed", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
