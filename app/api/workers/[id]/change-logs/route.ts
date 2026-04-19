import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, withTenant } from "@/lib/api-context";
import { prisma } from "@/lib/prisma";
import { changeLogCreateSchema } from "@/lib/schemas";
import { logger } from "@/lib/logger";

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
      const rows = await prisma.workerChangeLog.findMany({
        where: { workerId: params.id },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json({ data: rows });
    });
  } catch (error) {
    logger.error("GET change-logs failed", error);
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
    const parsed = changeLogCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const d = parsed.data;

    return await withTenant(user, req, async () => {
      const worker = await prisma.worker.findUnique({
        where: { id: params.id },
      });
      if (!worker) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      const row = await prisma.workerChangeLog.create({
        data: {
          workerId: params.id,
          tenantId: user.tenantId,
          changeCategory: d.changeCategory,
          summary: d.summary,
          previousValue: d.previousValue ?? undefined,
          newValue: d.newValue ?? undefined,
          effectiveDate: d.effectiveDate
            ? new Date(d.effectiveDate)
            : undefined,
          createdByUserId: user.id,
        },
      });
      return NextResponse.json({ data: row }, { status: 201 });
    });
  } catch (error) {
    logger.error("POST change-logs failed", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
