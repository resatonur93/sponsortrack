import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, withTenant } from "@/lib/api-context";
import { prisma } from "@/lib/prisma";
import { manualNotificationSchema } from "@/lib/schemas";
import { logger } from "@/lib/logger";
import { buildComplianceEventData } from "@/lib/compliance-event-factory";
import type { NotificationStatus, NotificationType, Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") as NotificationStatus | null;
    const type = searchParams.get("type") as NotificationType | null;
    const overdueOnly = searchParams.get("overdueOnly") === "true";

    return await withTenant(user, req, async () => {
      const where: Prisma.NotificationEventWhereInput = {};
      if (status) where.status = status;
      if (type) where.eventType = type;
      if (overdueOnly) {
        where.status = "OVERDUE";
      }

      const items = await prisma.notificationEvent.findMany({
        where,
        include: {
          worker: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: { dueDate: "asc" },
        take: 500,
      });
      return NextResponse.json({ data: items });
    });
  } catch (error) {
    logger.error("GET /api/notifications failed", error);
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
    const parsed = manualNotificationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const d = parsed.data;

    return await withTenant(user, req, async () => {
      const worker = await prisma.worker.findUnique({
        where: { id: d.workerId },
      });
      if (!worker) {
        return NextResponse.json({ error: "Worker not found" }, { status: 404 });
      }
      const key = `manual:${d.workerId}:${d.eventType}:${d.dueDate}:${Date.now()}`;
      const due = new Date(d.dueDate);
      const eventType = d.eventType as NotificationType;
      const payload = buildComplianceEventData({
        workerId: d.workerId,
        tenantId: user.tenantId,
        eventType,
        idempotencyKey: key,
        dueDate: due,
        reportDeadlineAt: due,
        workerName: `${worker.firstName} ${worker.lastName}`,
        cosReference: worker.cosReference,
        notes: d.notes,
        metadata: { ...(d.metadata ?? {}), source: "manual" },
      });
      const created = await prisma.notificationEvent.create({
        data: {
          ...payload,
          metadata: payload.metadata as object,
        },
      });
      return NextResponse.json({ data: created }, { status: 201 });
    });
  } catch (error) {
    logger.error("POST /api/notifications failed", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
