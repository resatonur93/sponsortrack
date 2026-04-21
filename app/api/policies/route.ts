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
      const rows = await prisma.policy.findMany({
        where: { tenantId: user.tenantId },
        orderBy: [{ category: "asc" }, { effectiveDate: "desc" }, { title: "asc" }],
      });
      const policyIds = rows.map((r) => r.id);
      const acks =
        policyIds.length === 0
          ? []
          : await prisma.acknowledgement.findMany({
              where: {
                userId: user.id,
                policyId: { in: policyIds },
              },
              select: { policyId: true, acknowledgedAt: true },
            });
      const ackMap = new Map(
        acks.map((a) => [a.policyId, a.acknowledgedAt.toISOString()])
      );

      const data = rows.map((p) => ({
        id: p.id,
        title: p.title,
        version: p.version,
        effectiveDate: p.effectiveDate.toISOString(),
        category: p.category,
        isAcknowledgementRequired: p.isAcknowledgementRequired,
        createdAt: p.createdAt.toISOString(),
        myAcknowledgedAt: ackMap.get(p.id) ?? null,
        status:
          p.isAcknowledgementRequired && !ackMap.has(p.id)
            ? ("Pending" as const)
            : ("Acknowledged" as const),
      }));

      return NextResponse.json({ data });
    });
  } catch (e) {
    logger.error("GET /api/policies failed", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
