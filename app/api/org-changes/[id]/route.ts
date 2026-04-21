import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { getSessionUser, withTenant } from "@/lib/api-context";
import { prisma } from "@/lib/prisma";
import { orgChangeUpdateSchema } from "@/lib/schemas";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

type RouteParams = { params: { id: string } };

export async function PUT(
  req: NextRequest,
  context: RouteParams
): Promise<NextResponse> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = context.params;
    const body: unknown = await req.json();
    const parsed = orgChangeUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const p = parsed.data;

    return await withTenant(user, req, async () => {
      const existing = await prisma.orgChange.findFirst({ where: { id } });
      if (!existing) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      const data: Prisma.OrgChangeUpdateInput = {};
      if (p.changeType !== undefined) data.changeType = p.changeType;
      if (p.description !== undefined) data.description = p.description;
      if (p.effectiveDate !== undefined) {
        data.effectiveDate = new Date(p.effectiveDate);
      }
      if (p.hoReportDeadline !== undefined) {
        data.hoReportDeadline = new Date(p.hoReportDeadline);
      }
      if (p.status !== undefined) data.status = p.status;
      if (p.reportedToHO !== undefined) data.reportedToHO = p.reportedToHO;
      if (p.hoReportDate !== undefined) {
        data.hoReportDate =
          p.hoReportDate && p.hoReportDate !== ""
            ? new Date(p.hoReportDate)
            : null;
      }
      if (p.evidenceDocuments !== undefined) {
        data.evidenceDocuments = { set: p.evidenceDocuments };
      }
      if (p.approvedBy !== undefined) data.approvedBy = p.approvedBy;
      if (p.notes !== undefined) data.notes = p.notes;

      const updated = await prisma.orgChange.update({
        where: { id },
        data,
      });
      return NextResponse.json({ data: updated });
    });
  } catch (error) {
    logger.error("PUT /api/org-changes/[id] failed", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
