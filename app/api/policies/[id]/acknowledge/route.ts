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
      const policy = await prisma.policy.findFirst({
        where: { id: params.id, tenantId: user.tenantId },
      });
      if (!policy) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      const row = await prisma.acknowledgement.upsert({
        where: {
          policyId_userId: { policyId: policy.id, userId: user.id },
        },
        create: {
          policyId: policy.id,
          userId: user.id,
          tenantId: user.tenantId,
        },
        update: { acknowledgedAt: new Date() },
      });

      return NextResponse.json({
        data: {
          policyId: row.policyId,
          acknowledgedAt: row.acknowledgedAt.toISOString(),
        },
      });
    });
  } catch (e) {
    logger.error("POST /api/policies/[id]/acknowledge failed", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
