import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, withTenant } from "@/lib/api-context";
import { prisma, prismaBase } from "@/lib/prisma";
import { closeStaleDocumentExpiringNotifications } from "@/lib/documents/document-expiring-notification-closure";
import { manualNotificationSchema } from "@/lib/schemas";
import { logger } from "@/lib/logger";
import { buildComplianceEventData } from "@/lib/compliance-event-factory";
import type { NotificationStatus, NotificationType, Prisma } from "@prisma/client";
import { addDays, startOfDay } from "@/lib/dates";
import { dedupeNotificationsForInboxList } from "@/lib/notifications/notification-list-dedupe";

export const dynamic = "force-dynamic";

/** Varsayılan: son N günde oluşturulan bildirimler. `daysBack=0` veya `daysBack=all` tarih filtresini kapatır. */
function createdAtCutoffFromQuery(searchParams: URLSearchParams): Date | undefined {
  const raw = searchParams.get("daysBack");
  const lowered = raw?.toLowerCase() ?? "";
  if (lowered === "0" || lowered === "all") return undefined;

  let days: number;
  if (raw === null || raw === "") days = 30;
  else {
    const parsed = parseInt(raw, 10);
    days = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), 3650) : 30;
  }

  const anchor = startOfDay(new Date());
  return addDays(anchor, -days);
}

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
    /** When `"1"`, return every matching row so the same worker can appear for multiple visas/milestones. */
    const listAll = searchParams.get("all") === "1";
    const createdAtGte = createdAtCutoffFromQuery(searchParams);
    const unreadOnly =
      searchParams.get("unread") === "1" || searchParams.get("unread") === "true";
    const readOnly =
      searchParams.get("read") === "1" || searchParams.get("read") === "true";

    return await withTenant(user, req, async () => {
      await closeStaleDocumentExpiringNotifications(prismaBase, {
        tenantId: user.tenantId,
      });

      const where: Prisma.NotificationEventWhereInput = {};
      if (status) where.status = status;
      if (type) where.eventType = type;
      if (overdueOnly) {
        where.status = "OVERDUE";
      }
      if (createdAtGte) {
        where.createdAt = { gte: createdAtGte };
      }
      if (unreadOnly && !readOnly) {
        where.readAt = null;
      } else if (readOnly && !unreadOnly) {
        where.readAt = { not: null };
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
        take: 1000,
      });
      const data = listAll ? items : dedupeNotificationsForInboxList(items);
      return NextResponse.json({ data });
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
      const key = `manual:${user.tenantId}:${d.workerId}:${d.eventType}:${d.dueDate}`;
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
