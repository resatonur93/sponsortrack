import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { getSessionUser, withTenant } from "@/lib/api-context";
import { prisma } from "@/lib/prisma";
import { supplementaryEmploymentUpdateSchema } from "@/lib/schemas";
import { logger } from "@/lib/logger";
import { computeSupplementaryEmploymentFlags } from "@/lib/supplementary-employment-flags";

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
    const parsed = supplementaryEmploymentUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const p = parsed.data;

    return await withTenant(user, req, async () => {
      const existing = await prisma.supplementaryEmployment.findFirst({
        where: { id },
      });
      if (!existing) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      const nextEnd =
        p.endDate !== undefined
          ? p.endDate
            ? new Date(p.endDate)
            : null
          : existing.endDate;
      if (nextEnd && nextEnd.getTime() < existing.startDate.getTime()) {
        return NextResponse.json(
          { error: "endDate must be on or after startDate" },
          { status: 400 }
        );
      }

      const hoursPerWeek = p.hoursPerWeek ?? existing.hoursPerWeek;
      const isSameOccupation = p.isSameOccupation ?? existing.isSameOccupation;
      const isShortageOccupation =
        p.isShortageOccupation ?? existing.isShortageOccupation;
      const flags = computeSupplementaryEmploymentFlags({
        hoursPerWeek,
        isSameOccupation,
        isShortageOccupation,
      });

      const data: Prisma.SupplementaryEmploymentUpdateInput = { flags };
      if (p.employerName !== undefined) data.employerName = p.employerName;
      if (p.occupationCode !== undefined) data.occupationCode = p.occupationCode;
      if (p.isSameOccupation !== undefined) data.isSameOccupation = p.isSameOccupation;
      if (p.isShortageOccupation !== undefined)
        data.isShortageOccupation = p.isShortageOccupation;
      if (p.hoursPerWeek !== undefined) data.hoursPerWeek = p.hoursPerWeek;
      if (p.endDate !== undefined) data.endDate = nextEnd;
      if (p.status !== undefined) data.status = p.status;
      if (p.notes !== undefined) data.notes = p.notes;

      const updated = await prisma.supplementaryEmployment.update({
        where: { id },
        data,
      });

      return NextResponse.json({ data: updated });
    });
  } catch (error) {
    logger.error("PUT /api/supplementary-employment/[id] failed", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
