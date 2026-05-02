import type { NotificationEvent } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { startOfDayUtc } from "@/lib/escalation";

const DAY_MS = 86_400_000;

export async function markNotificationAsCompleted(opts: {
  notificationId: string;
  resolvedByUserId: string;
  notes?: string | null;
}): Promise<
  | { ok: true; notification: NotificationEvent }
  | { ok: false; reason: "NOT_FOUND" | "CANCELLED"; message?: string }
> {
  const existing = await prisma.notificationEvent.findUnique({
    where: { id: opts.notificationId },
  });
  if (!existing) return { ok: false, reason: "NOT_FOUND" };
  if (existing.status === "CANCELLED") {
    return { ok: false, reason: "CANCELLED", message: "Cancelled notification cannot be completed" };
  }

  const mergedNotes =
    opts.notes !== undefined ? opts.notes ?? null : existing.notes ?? null;

  if (existing.status === "COMPLETED") {
    logger.info("notification.complete.idempotent", {
      notificationId: opts.notificationId,
      tenantId: existing.tenantId,
      resolvedByUserId: opts.resolvedByUserId,
    });
    return { ok: true, notification: existing };
  }

  const now = new Date();
  const updated = await prisma.notificationEvent.update({
    where: { id: opts.notificationId },
    data: {
      status: "COMPLETED",
      reportedDate: now,
      notes: mergedNotes,
      readAt: existing.readAt ?? now,
    },
  });

  logger.info("notification.completed", {
    notificationId: updated.id,
    tenantId: updated.tenantId,
    resolvedByUserId: opts.resolvedByUserId,
    eventType: updated.eventType,
  });

  return { ok: true, notification: updated };
}

export async function markNotificationAsRead(opts: {
  notificationId: string;
}): Promise<
  | { ok: true; notification: NotificationEvent }
  | { ok: false; reason: "NOT_FOUND" }
> {
  const existing = await prisma.notificationEvent.findUnique({
    where: { id: opts.notificationId },
  });
  if (!existing) return { ok: false, reason: "NOT_FOUND" };

  if (existing.readAt != null) {
    return { ok: true, notification: existing };
  }

  const updated = await prisma.notificationEvent.update({
    where: { id: opts.notificationId },
    data: { readAt: new Date() },
  });

  logger.info("notification.read", { notificationId: updated.id, tenantId: updated.tenantId });
  return { ok: true, notification: updated };
}

export async function deferNotificationEvent(opts: {
  notificationId: string;
  deferredByUserId: string;
  days: number;
}): Promise<
  | { ok: true; notification: NotificationEvent }
  | { ok: false; reason: "NOT_FOUND" | "INVALID_STATE" | "BAD_DAYS" }
> {
  if (opts.days < 1 || opts.days > 90) {
    return { ok: false, reason: "BAD_DAYS" };
  }

  const existing = await prisma.notificationEvent.findUnique({
    where: { id: opts.notificationId },
  });
  if (!existing) return { ok: false, reason: "NOT_FOUND" };
  if (existing.status === "COMPLETED" || existing.status === "CANCELLED") {
    return { ok: false, reason: "INVALID_STATE" };
  }

  const newDue = new Date(existing.dueDate.getTime() + opts.days * DAY_MS);
  const newRep = existing.reportDeadlineAt
    ? new Date(existing.reportDeadlineAt.getTime() + opts.days * DAY_MS)
    : null;

  const now = new Date();
  const dueDay = startOfDayUtc(newDue);
  const todayStart = startOfDayUtc(now);
  const nextStatus = dueDay.getTime() < todayStart.getTime() ? "OVERDUE" : "PENDING";

  const updated = await prisma.notificationEvent.update({
    where: { id: opts.notificationId },
    data: {
      dueDate: newDue,
      ...(newRep ? { reportDeadlineAt: newRep } : {}),
      status: nextStatus,
      reminderStage: { increment: 1 },
    },
  });

  logger.info("notification.deferred", {
    notificationId: updated.id,
    tenantId: updated.tenantId,
    deferredByUserId: opts.deferredByUserId,
    days: opts.days,
    eventType: updated.eventType,
  });

  return { ok: true, notification: updated };
}
