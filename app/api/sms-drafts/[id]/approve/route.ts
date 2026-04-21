import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, withTenant } from "@/lib/api-context";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

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
      const existing = await prisma.smsReportDraft.findFirst({
        where: { id: params.id },
      });
      if (!existing) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      if (existing.approvedAt) {
        return NextResponse.json(
          { error: "Draft already approved" },
          { status: 409 }
        );
      }
      if (existing.sentToHO) {
        return NextResponse.json(
          { error: "Cannot approve after marked sent" },
          { status: 409 }
        );
      }

      const updated = await prisma.smsReportDraft.update({
        where: { id: params.id },
        data: {
          approvedBy: user.id,
          approvedAt: new Date(),
        },
        include: {
          event: {
            select: {
              id: true,
              eventType: true,
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

      return NextResponse.json({ data: updated });
    });
  } catch (e) {
    logger.error("PUT /api/sms-drafts/[id]/approve failed", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
