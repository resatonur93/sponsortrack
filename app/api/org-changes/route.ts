import { NextRequest, NextResponse } from "next/server";
import { OrgChangeStatus } from "@prisma/client";
import { getSessionUser, withTenant } from "@/lib/api-context";
import { prisma } from "@/lib/prisma";
import { orgChangeCreateSchema } from "@/lib/schemas";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return await withTenant(user, req, async () => {
      const now = new Date();
      await prisma.orgChange.updateMany({
        where: {
          reportedToHO: false,
          hoReportDeadline: { lt: now },
          status: { not: OrgChangeStatus.REPORTED },
        },
        data: { status: OrgChangeStatus.OVERDUE },
      });

      const rows = await prisma.orgChange.findMany({
        orderBy: [{ effectiveDate: "desc" }, { createdAt: "desc" }],
        take: 300,
      });
      return NextResponse.json({ data: rows });
    });
  } catch (error) {
    logger.error("GET /api/org-changes failed", error);
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
    const body: unknown = await req.json();
    const parsed = orgChangeCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const d = parsed.data;

    return await withTenant(user, req, async () => {
      const evidence = d.evidenceDocuments ?? [];
      const row = await prisma.orgChange.create({
        data: {
          tenantId: user.tenantId,
          changeType: d.changeType,
          description: d.description,
          effectiveDate: new Date(d.effectiveDate),
          hoReportDeadline: new Date(d.hoReportDeadline),
          status: d.status ?? OrgChangeStatus.PENDING,
          reportedToHO: d.reportedToHO ?? false,
          hoReportDate: d.hoReportDate
            ? new Date(d.hoReportDate)
            : undefined,
          evidenceDocuments: evidence,
          approvedBy: d.approvedBy ?? undefined,
          notes: d.notes ?? undefined,
        },
      });
      return NextResponse.json({ data: row }, { status: 201 });
    });
  } catch (error) {
    logger.error("POST /api/org-changes failed", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
