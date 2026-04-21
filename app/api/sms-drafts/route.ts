import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, withTenant } from "@/lib/api-context";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return await withTenant(user, req, async () => {
      const eventId = req.nextUrl.searchParams.get("eventId")?.trim() || null;

      const rows = await prisma.smsReportDraft.findMany({
        where: eventId ? { eventId } : undefined,
        orderBy: { createdAt: "desc" },
        take: 200,
        include: {
          event: {
            select: {
              id: true,
              eventType: true,
              eventDate: true,
              reportDeadline: true,
              status: true,
              worker: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  cosReference: true,
                },
              },
            },
          },
        },
      });

      return NextResponse.json({ data: rows });
    });
  } catch (e) {
    logger.error("GET /api/sms-drafts failed", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
