import { NextRequest, NextResponse } from "next/server";
import { OrgChangeStatus } from "@prisma/client";
import { getSessionUser, withTenant } from "@/lib/api-context";
import { prisma } from "@/lib/prisma";
import { orgChangeReportToHoSchema } from "@/lib/schemas";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

type RouteParams = { params: { id: string } };

export async function POST(
  req: NextRequest,
  context: RouteParams
): Promise<NextResponse> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = context.params;
    const body: unknown = await req.json().catch(() => ({}));
    const parsed = orgChangeReportToHoSchema.safeParse(
      typeof body === "object" && body !== null ? body : {}
    );
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const d = parsed.data;

    return await withTenant(user, req, async () => {
      const existing = await prisma.orgChange.findFirst({ where: { id } });
      if (!existing) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      const hoReportDate =
        d.hoReportDate && d.hoReportDate !== ""
          ? new Date(d.hoReportDate)
          : new Date();

      const updated = await prisma.orgChange.update({
        where: { id },
        data: {
          reportedToHO: true,
          hoReportDate,
          status: OrgChangeStatus.REPORTED,
        },
      });
      return NextResponse.json({ data: updated });
    });
  } catch (error) {
    logger.error("POST /api/org-changes/[id]/report-to-ho failed", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
