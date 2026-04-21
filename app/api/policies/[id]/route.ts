import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, withTenant } from "@/lib/api-context";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

export async function GET(
  req: NextRequest,
  { params }: Params
): Promise<NextResponse> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return await withTenant(user, req, async () => {
      const row = await prisma.policy.findFirst({
        where: { id: params.id, tenantId: user.tenantId },
      });
      if (!row) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      const ack = await prisma.acknowledgement.findUnique({
        where: {
          policyId_userId: { policyId: row.id, userId: user.id },
        },
      });

      return NextResponse.json({
        data: {
          id: row.id,
          title: row.title,
          content: row.content,
          version: row.version,
          effectiveDate: row.effectiveDate.toISOString(),
          category: row.category,
          isAcknowledgementRequired: row.isAcknowledgementRequired,
          createdAt: row.createdAt.toISOString(),
          myAcknowledgedAt: ack?.acknowledgedAt.toISOString() ?? null,
          status:
            row.isAcknowledgementRequired && !ack
              ? ("Pending" as const)
              : ("Acknowledged" as const),
        },
      });
    });
  } catch (e) {
    logger.error("GET /api/policies/[id] failed", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
