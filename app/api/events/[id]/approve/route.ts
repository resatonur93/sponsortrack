import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, withTenant } from "@/lib/api-context";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

export async function POST(
  req: NextRequest,
  { params }: Params
): Promise<NextResponse> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return await withTenant(user, req, async () => {
      const existing = await prisma.complianceEvent.findFirst({
        where: { id: params.id, tenantId: user.tenantId },
      });
      if (!existing) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      if (
        existing.status === "CANCELLED" ||
        existing.status === "REPORTED"
      ) {
        return NextResponse.json(
          { error: "Invalid status for approval" },
          { status: 409 }
        );
      }

      const updated = await prisma.complianceEvent.update({
        where: { id: params.id },
        data: {
          status: "APPROVED",
          approvedBy: user.id,
        },
        include: {
          worker: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              cosReference: true,
            },
          },
        },
      });

      return NextResponse.json({ data: updated });
    });
  } catch (e) {
    logger.error("POST /api/events/[id]/approve failed", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
