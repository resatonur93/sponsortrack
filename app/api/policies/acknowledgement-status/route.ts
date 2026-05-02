import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, withTenant } from "@/lib/api-context";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { canManagePolicies } from "@/lib/policies/policy-permissions";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const policyId = req.nextUrl.searchParams.get("policyId")?.trim();
    if (!policyId) {
      return NextResponse.json(
        { error: "policyId query parameter is required" },
        { status: 400 }
      );
    }

    return await withTenant(user, req, async () => {
      if (!canManagePolicies(user.role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const policy = await prisma.policy.findFirst({
        where: { id: policyId, tenantId: user.tenantId },
        select: { id: true, title: true },
      });
      if (!policy) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      const rows = await prisma.acknowledgement.findMany({
        where: { policyId, tenantId: user.tenantId },
        orderBy: { acknowledgedAt: "desc" },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      return NextResponse.json({
        data: {
          policy: { id: policy.id, title: policy.title },
          acknowledgements: rows.map((r) => ({
            userId: r.userId,
            acknowledgedAt: r.acknowledgedAt.toISOString(),
            user: r.user,
          })),
        },
      });
    });
  } catch (e) {
    logger.error("GET /api/policies/acknowledgement-status failed", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
