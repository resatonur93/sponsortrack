import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, withTenant } from "@/lib/api-context";
import { prisma } from "@/lib/prisma";
import { supplementaryEmploymentCreateSchema } from "@/lib/schemas";
import { logger } from "@/lib/logger";
import { computeSupplementaryEmploymentFlags } from "@/lib/supplementary-employment-flags";

export const dynamic = "force-dynamic";

type RouteParams = { params: { id: string } };

export async function GET(
  req: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return await withTenant(user, req, async () => {
      const worker = await prisma.worker.findFirst({
        where: { id: params.id },
        select: { id: true },
      });
      if (!worker) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      const rows = await prisma.supplementaryEmployment.findMany({
        where: { workerId: params.id },
        orderBy: { startDate: "desc" },
      });
      return NextResponse.json({ data: rows });
    });
  } catch (error) {
    logger.error("GET supplementary-employment failed", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body: unknown = await req.json();
    const parsed = supplementaryEmploymentCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const d = parsed.data;

    return await withTenant(user, req, async () => {
      const worker = await prisma.worker.findFirst({
        where: { id: params.id },
        select: { id: true },
      });
      if (!worker) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      const flags = computeSupplementaryEmploymentFlags({
        hoursPerWeek: d.hoursPerWeek,
        isSameOccupation: d.isSameOccupation,
        isShortageOccupation: d.isShortageOccupation,
      });

      const row = await prisma.supplementaryEmployment.create({
        data: {
          workerId: params.id,
          tenantId: user.tenantId,
          employerName: d.employerName,
          occupationCode: d.occupationCode,
          isSameOccupation: d.isSameOccupation,
          isShortageOccupation: d.isShortageOccupation,
          hoursPerWeek: d.hoursPerWeek,
          startDate: new Date(d.startDate),
          endDate: d.endDate ? new Date(d.endDate) : undefined,
          status: d.status ?? undefined,
          notes: d.notes ?? undefined,
          flags,
        },
      });

      return NextResponse.json({ data: row }, { status: 201 });
    });
  } catch (error) {
    logger.error("POST supplementary-employment failed", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
