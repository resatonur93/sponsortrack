import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, withTenant } from "@/lib/api-context";
import { notificationDeferSchema } from "@/lib/schemas";
import { logger } from "@/lib/logger";
import { deferNotificationEvent } from "@/lib/notifications/notification-actions";

export const dynamic = "force-dynamic";

type RouteParams = { params: { id: string } };

export async function POST(
  req: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body: unknown = await req.json().catch(() => ({}));
    const parsed = notificationDeferSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    return await withTenant(user, req, async () => {
      const result = await deferNotificationEvent({
        notificationId: params.id,
        deferredByUserId: user.id,
        days: parsed.data.days,
      });

      if (!result.ok) {
        if (result.reason === "NOT_FOUND") {
          return NextResponse.json({ error: "Not found" }, { status: 404 });
        }
        if (result.reason === "BAD_DAYS") {
          return NextResponse.json({ error: "Invalid days value" }, { status: 400 });
        }
        return NextResponse.json(
          { error: "Defer not allowed for this notification" },
          { status: 409 }
        );
      }

      return NextResponse.json({ data: result.notification });
    });
  } catch (error) {
    logger.error("POST /api/notifications/[id]/defer failed", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
