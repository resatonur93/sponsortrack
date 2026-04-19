import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, withTenant } from "@/lib/api-context";
import { prisma } from "@/lib/prisma";
import { rtwCheckCreateSchema } from "@/lib/schemas";
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
      const rows = await prisma.rightToWorkCheck.findMany({
        where: { workerId: params.id },
        orderBy: { checkedAt: "desc" },
      });
      return NextResponse.json({ data: rows });
    });
  } catch (error) {
    logger.error("GET rtw-checks failed", error);
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
    const parsed = rtwCheckCreateSchema.safeParse(body);
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

      const checkedAt = d.checkedAt ? new Date(d.checkedAt) : new Date();

      const row = await prisma.rightToWorkCheck.create({
        data: {
          workerId: params.id,
          tenantId: user.tenantId,
          checkedAt,
          checkMethod: d.checkMethod,
          outcomeSummary: d.outcomeSummary ?? undefined,
          shareCodeUsed: d.shareCodeUsed ?? undefined,
          notes: d.notes ?? undefined,
          evidenceDocumentId: d.evidenceDocumentId ?? undefined,
          nextCheckDueAt: d.nextCheckDueAt
            ? new Date(d.nextCheckDueAt)
            : undefined,
          createdByUserId: user.id,
        },
      });

      await prisma.worker.update({
        where: { id: params.id },
        data: { rightToWorkLastCheckedAt: checkedAt },
      });

      return NextResponse.json({ data: row }, { status: 201 });
    });
  } catch (error) {
    logger.error("POST rtw-checks failed", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
