import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, withTenant } from "@/lib/api-context";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { policyCreateSchema } from "@/lib/schemas";
import { canManagePolicies } from "@/lib/policies/policy-permissions";
import { getAcknowledgementRatesForPolicies } from "@/lib/policies/acknowledgement-rate";

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
        orderBy: [{ updatedAt: "desc" }, { category: "asc" }, { title: "asc" }],
      });
      const policyIds = rows.map((r) => r.id);

      const rates = await getAcknowledgementRatesForPolicies(user.tenantId, policyIds);

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

      const data = rows.map((p) => {
        const r =
          rates.get(p.id) ?? ({ ackCount: 0, ratePercent: 0, userTotal: 0 });
        return {
          id: p.id,
          title: p.title,
          version: p.version,
          effectiveDate: p.effectiveDate.toISOString(),
          category: p.category,
          isAcknowledgementRequired: p.isAcknowledgementRequired,
          createdAt: p.createdAt.toISOString(),
          updatedAt: p.updatedAt.toISOString(),
          fileUrl: p.fileUrl,
          myAcknowledgedAt: ackMap.get(p.id) ?? null,
          status:
            p.isAcknowledgementRequired && !ackMap.has(p.id)
              ? ("Pending" as const)
              : ("Acknowledged" as const),
          acknowledgementRatePercent: r.ratePercent,
          acknowledgedUserCount: r.ackCount,
          tenantUserTotal: r.userTotal,
        };
      });

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

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!canManagePolicies(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const raw: unknown = await req.json();
    const parsed = policyCreateSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const d = parsed.data;

    return await withTenant(user, req, async () => {
      const created = await prisma.policy.create({
        data: {
          tenantId: user.tenantId,
          title: d.title.trim(),
          content: d.content.trim() || " ",
          version: d.version.trim(),
          effectiveDate: new Date(d.effectiveDate),
          category: d.category,
          isAcknowledgementRequired: d.isAcknowledgementRequired,
          fileUrl: d.fileUrl ?? null,
        },
      });

      logger.info("policy.created", {
        policyId: created.id,
        tenantId: created.tenantId,
        actorUserId: user.id,
        category: created.category,
      });

      return NextResponse.json({ data: created }, { status: 201 });
    });
  } catch (e) {
    logger.error("POST /api/policies failed", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
