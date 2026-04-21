import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/api-context";
import { prismaBase } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { requireAuthorisingOfficer } from "@/lib/admin-auth";
import { adminLeadUpdateSchema } from "@/lib/leads";
import { createLeadActivity } from "@/lib/lead-activity";

export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

export async function GET(
  _req: NextRequest,
  { params }: Params
): Promise<NextResponse> {
  try {
    const user = await getSessionUser();
    if (!requireAuthorisingOfficer(user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const lead = await prismaBase.lead.findFirst({
      where: { id: params.id, isDeleted: false },
      include: {
        assignee: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        activities: {
          orderBy: { createdAt: "desc" },
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
        },
      },
    });
    if (!lead) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ data: lead });
  } catch (e) {
    logger.error("GET /api/admin/leads/[id] failed", e);
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
    const sessionUser = await getSessionUser();
    if (!requireAuthorisingOfficer(sessionUser)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const existing = await prismaBase.lead.findFirst({
      where: { id: params.id, isDeleted: false },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body: unknown = await req.json();
    const parsed = adminLeadUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Geçersiz veri", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const d = parsed.data;

    if (d.assignedTo) {
      const u = await prismaBase.user.findUnique({ where: { id: d.assignedTo } });
      if (!u) {
        return NextResponse.json({ error: "Atanan kullanıcı bulunamadı." }, { status: 400 });
      }
    }

    const nextStatus = d.status ?? existing.status;
    const nextNotes = d.notes !== undefined ? d.notes : existing.notes;
    const nextAssign = d.assignedTo !== undefined ? d.assignedTo : existing.assignedTo;

    const updated = await prismaBase.lead.update({
      where: { id: params.id },
      data: {
        status: nextStatus,
        notes: nextNotes ?? undefined,
        assignedTo: nextAssign ?? null,
      },
      include: {
        assignee: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    if (d.status !== undefined && d.status !== existing.status) {
      await createLeadActivity({
        leadId: params.id,
        type: "STATUS_CHANGE",
        message: `Durum: ${existing.status} → ${d.status}`,
        userId: sessionUser.id,
        metadata: { from: existing.status, to: d.status },
      });
    }
    if (d.notes !== undefined && d.notes !== existing.notes) {
      await createLeadActivity({
        leadId: params.id,
        type: "NOTE_UPDATE",
        message: "Notlar güncellendi",
        userId: sessionUser.id,
      });
    }
    if (d.assignedTo !== undefined && d.assignedTo !== existing.assignedTo) {
      await createLeadActivity({
        leadId: params.id,
        type: "ASSIGN",
        message: d.assignedTo ? `Atanan: ${d.assignedTo}` : "Atama kaldırıldı",
        userId: sessionUser.id,
        metadata: { assignedTo: d.assignedTo },
      });
    }

    return NextResponse.json({ data: updated });
  } catch (e) {
    logger.error("PUT /api/admin/leads/[id] failed", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: Params
): Promise<NextResponse> {
  try {
    const sessionUser = await getSessionUser();
    if (!requireAuthorisingOfficer(sessionUser)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const existing = await prismaBase.lead.findFirst({
      where: { id: params.id, isDeleted: false },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prismaBase.lead.update({
      where: { id: params.id },
      data: { isDeleted: true, deletedAt: new Date() },
    });

    await createLeadActivity({
      leadId: params.id,
      type: "SOFT_DELETE",
      message: "Lead arşivlendi",
      userId: sessionUser.id,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    logger.error("DELETE /api/admin/leads/[id] failed", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
