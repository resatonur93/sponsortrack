import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, withTenant } from "@/lib/api-context";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { complianceEventUpdateSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

export async function GET(
  _req: NextRequest,
  { params }: Params
): Promise<NextResponse> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return await withTenant(user, _req, async () => {
      const row = await prisma.complianceEvent.findFirst({
        where: { id: params.id },
        include: {
          worker: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              cosReference: true,
            },
          },
          workflowSteps: {
            orderBy: { createdAt: "asc" },
            include: {
              assignee: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  role: true,
                },
              },
              actionedByUser: {
                select: { id: true, firstName: true, lastName: true },
              },
            },
          },
        },
      });
      if (!row) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      return NextResponse.json({ data: row });
    });
  } catch (e) {
    logger.error("GET /api/events/[id] failed", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: Params
): Promise<NextResponse> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body: unknown = await req.json();
    const parsed = complianceEventUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    return await withTenant(user, req, async () => {
      const existing = await prisma.complianceEvent.findFirst({
        where: { id: params.id, tenantId: user.tenantId },
      });
      if (!existing) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      const d = parsed.data;
      const updated = await prisma.complianceEvent.update({
        where: { id: params.id },
        data: {
          ...(d.status !== undefined ? { status: d.status } : {}),
          ...(d.notes !== undefined ? { notes: d.notes } : {}),
          ...(d.approvedBy !== undefined ? { approvedBy: d.approvedBy } : {}),
        },
        include: {
          worker: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              cosReference: true,
            },
          },
        },
      });

      return NextResponse.json({ data: updated });
    });
  } catch (e) {
    logger.error("PUT /api/events/[id] failed", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: Params
): Promise<NextResponse> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return await withTenant(user, req, async () => {
      const existing = await prisma.complianceEvent.findFirst({
        where: { id: params.id, tenantId: user.tenantId },
      });
      if (!existing) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      await prisma.complianceEvent.delete({
        where: { id: params.id },
      });

      return NextResponse.json({ ok: true });
    });
  } catch (e) {
    logger.error("DELETE /api/events/[id] failed", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
