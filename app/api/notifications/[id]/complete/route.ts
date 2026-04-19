import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, withTenant } from "@/lib/api-context";
import { prisma } from "@/lib/prisma";
import { notificationCompleteSchema } from "@/lib/schemas";
import { logger } from "@/lib/logger";

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
    const parsed = notificationCompleteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    return await withTenant(user, req, async () => {
      const existing = await prisma.notificationEvent.findUnique({
        where: { id: params.id },
      });
      if (!existing) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      const updated = await prisma.notificationEvent.update({
        where: { id: params.id },
        data: {
          status: "COMPLETED",
          reportedDate: new Date(),
          notes: parsed.data.notes ?? existing.notes,
        },
      });
      return NextResponse.json({ data: updated });
    });
  } catch (error) {
    logger.error("POST /api/notifications/[id]/complete failed", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
