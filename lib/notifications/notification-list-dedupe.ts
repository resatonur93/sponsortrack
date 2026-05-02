import type { NotificationType } from "@prisma/client";

/**
 * Gruplama: visa / sponsorship / RTW zaman penceresi olayları çalışan başına tek satır olur (en yakın vade öncelikli).
 */
export function notificationDedupeBucketKey(workerId: string, eventType: NotificationType): string {
  const t = String(eventType);
  if (t.startsWith("VISA_EXPIRING")) return `${workerId}::visa`;
  if (t.startsWith("SPONSORSHIP_ENDING")) return `${workerId}::sponsorship`;
  if (t.startsWith("RIGHT_TO_WORK_RECHECK")) return `${workerId}::rtw`;
  return `${workerId}::${t}`;
}

/**
 * Liste görünümü için zaman penceresi spam’ını azaltır: aynı çalışan + aynı domain (vize/sponsor/RTW) için
 * en yakın vade tarihli olayı bırakır; eşit vadelerde en son güncellenen kazanır.
 */
export function dedupeNotificationsByWorkerWindow<
  T extends {
    workerId: string;
    eventType: NotificationType;
    id: string;
    reportDeadlineAt: Date | null;
    dueDate: Date;
    updatedAt: Date;
  },
>(items: T[]): T[] {
  const winners = new Map<string, T>();
  for (const item of items) {
    const bucket = notificationDedupeBucketKey(item.workerId, item.eventType);
    const hit = winners.get(bucket);
    if (!hit) {
      winners.set(bucket, item);
      continue;
    }
    const aMs = (item.reportDeadlineAt ?? item.dueDate).getTime();
    const bMs = (hit.reportDeadlineAt ?? hit.dueDate).getTime();
    if (aMs < bMs) {
      winners.set(bucket, item);
    } else if (aMs === bMs) {
      if (item.updatedAt.getTime() > hit.updatedAt.getTime()) {
        winners.set(bucket, item);
      } else if (
        item.updatedAt.getTime() === hit.updatedAt.getTime() &&
        item.id < hit.id
      ) {
        winners.set(bucket, item);
      }
    }
  }
  return Array.from(winners.values()).sort((u, v) => {
    const uMs = (u.reportDeadlineAt ?? u.dueDate).getTime();
    const vMs = (v.reportDeadlineAt ?? v.dueDate).getTime();
    return uMs - vMs;
  });
}
