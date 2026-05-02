import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, withTenant } from "@/lib/api-context";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { getAcknowledgementRatesForPolicies } from "@/lib/policies/acknowledgement-rate";

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

      const stats = await getAcknowledgementRatesForPolicies(user.tenantId, [row.id]);
      const rateRow = stats.get(row.id);

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
          updatedAt: row.updatedAt.toISOString(),
          fileUrl: row.fileUrl,
          myAcknowledgedAt: ack?.acknowledgedAt.toISOString() ?? null,
          status:
            row.isAcknowledgementRequired && !ack
              ? ("Pending" as const)
              : ("Acknowledged" as const),
          acknowledgementRatePercent: rateRow?.ratePercent ?? 0,
          acknowledgedUserCount: rateRow?.ackCount ?? 0,
          tenantUserTotal: rateRow?.userTotal ?? 0,
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
