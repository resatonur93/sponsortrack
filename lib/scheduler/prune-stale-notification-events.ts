import type { NotificationType, PrismaClient } from "@prisma/client";
import {
  dateWindowNotificationsToCreate,
  RTW_RECHECK_WINDOWS,
  SPONSORSHIP_END_WINDOWS,
  SPONSORSHIP_ENDING_NOTIFICATION_TYPES,
  RTW_RECHECK_NOTIFICATION_TYPES,
  VISA_EXPIRING_NOTIFICATION_TYPES,
  visaNotificationsToCreate,
} from "@/lib/notification-rules";

type PruneStats = { deleted: number };

async function deleteManyNotInKeys(
  db: PrismaClient,
  input: {
    workerId: string;
    tenantId: string;
    types: NotificationType[];
    keys: string[];
  }
): Promise<number> {
  const { keys } = input;
  if (keys.length === 0) return 0;
  const r = await db.notificationEvent.deleteMany({
    where: {
      workerId: input.workerId,
      tenantId: input.tenantId,
      status: { in: ["PENDING", "OVERDUE"] },
      eventType: { in: input.types },
      idempotencyKey: { notIn: keys },
    },
  });
  return r.count;
}

/**
 * Pasif / vizesi kalkmış çalışanlarda bekleyen vize penceresi olaylarını temizler.
 */
export async function pruneStalePendingVisaEvents(
  db: PrismaClient,
  w: { id: string; tenantId: string; visaExpiryDate: Date | null }
): Promise<PruneStats> {
  if (!w.visaExpiryDate) {
    const r = await db.notificationEvent.deleteMany({
      where: {
        workerId: w.id,
        tenantId: w.tenantId,
        status: { in: ["PENDING", "OVERDUE"] },
        eventType: { in: [...VISA_EXPIRING_NOTIFICATION_TYPES] },
      },
    });
    return { deleted: r.count };
  }
  const rows = visaNotificationsToCreate(w.id, w.tenantId, w.visaExpiryDate);
  const keys = rows.map((r) => r.idempotencyKey as string);
  const deleted = await deleteManyNotInKeys(db, {
    workerId: w.id,
    tenantId: w.tenantId,
    types: [...VISA_EXPIRING_NOTIFICATION_TYPES],
    keys,
  });
  return { deleted };
}

export async function pruneStalePendingSponsorshipEndingEvents(
  db: PrismaClient,
  w: { id: string; tenantId: string; sponsorshipEndDate: Date | null }
): Promise<PruneStats> {
  if (!w.sponsorshipEndDate) {
    const r = await db.notificationEvent.deleteMany({
      where: {
        workerId: w.id,
        tenantId: w.tenantId,
        status: { in: ["PENDING", "OVERDUE"] },
        eventType: { in: [...SPONSORSHIP_ENDING_NOTIFICATION_TYPES] },
      },
    });
    return { deleted: r.count };
  }
  const rows = dateWindowNotificationsToCreate({
    workerId: w.id,
    tenantId: w.tenantId,
    targetDate: w.sponsorshipEndDate,
    windows: SPONSORSHIP_END_WINDOWS,
    idKey: "sponsorship-end",
    metadataKey: "sponsorshipEndDate",
  });
  const keys = rows.map((r) => r.idempotencyKey as string);
  const deleted = await deleteManyNotInKeys(db, {
    workerId: w.id,
    tenantId: w.tenantId,
    types: [...SPONSORSHIP_ENDING_NOTIFICATION_TYPES],
    keys,
  });
  return { deleted };
}

export async function pruneStalePendingRtwRecheckEvents(
  db: PrismaClient,
  w: {
    id: string;
    tenantId: string;
    rtwNext: { id: string; nextCheckDueAt: Date } | null;
  }
): Promise<PruneStats> {
  if (!w.rtwNext) {
    const r = await db.notificationEvent.deleteMany({
      where: {
        workerId: w.id,
        tenantId: w.tenantId,
        status: { in: ["PENDING", "OVERDUE"] },
        eventType: { in: [...RTW_RECHECK_NOTIFICATION_TYPES] },
      },
    });
    return { deleted: r.count };
  }
  const rows = dateWindowNotificationsToCreate({
    workerId: w.id,
    tenantId: w.tenantId,
    targetDate: w.rtwNext.nextCheckDueAt,
    windows: RTW_RECHECK_WINDOWS,
    idKey: `rtw:${w.rtwNext.id}`,
    metadataKey: "rtwNextCheckDueAt",
  });
  const keys = rows.map((r) => r.idempotencyKey as string);
  const deleted = await deleteManyNotInKeys(db, {
    workerId: w.id,
    tenantId: w.tenantId,
    types: [...RTW_RECHECK_NOTIFICATION_TYPES],
    keys,
  });
  return { deleted };
}

export const WINDOW_COMPLIANCE_NOTIFICATION_TYPES: NotificationType[] = [
  ...VISA_EXPIRING_NOTIFICATION_TYPES,
  ...SPONSORSHIP_ENDING_NOTIFICATION_TYPES,
  ...RTW_RECHECK_NOTIFICATION_TYPES,
];
