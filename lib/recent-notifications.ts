import type { NotificationType } from "@prisma/client";

export const VISA_EXPIRING_TYPES: NotificationType[] = [
  "VISA_EXPIRING_90_DAYS",
  "VISA_EXPIRING_30_DAYS",
  "VISA_EXPIRING_7_DAYS",
];

const VISA_EXPIRING_SET = new Set(VISA_EXPIRING_TYPES);

const VISA_EXPIRING_URGENCY: Partial<Record<NotificationType, number>> = {
  VISA_EXPIRING_7_DAYS: 3,
  VISA_EXPIRING_30_DAYS: 2,
  VISA_EXPIRING_90_DAYS: 1,
};

export function isVisaExpiringNotificationType(t: NotificationType): boolean {
  return VISA_EXPIRING_SET.has(t);
}

function compareVisaExpiringUrgency<
  T extends { eventType: NotificationType; dueDate: Date },
>(a: T, b: T): T {
  const ta = new Date(a.dueDate).getTime();
  const tb = new Date(b.dueDate).getTime();
  /** Aynı çalışanda 90/30/7 gün hatırlatmalarının dueDate'i genelde artan sırada (vizeye yaklaştıkça); en acil = en geç dueDate (7 gün). */
  if (tb !== ta) {
    return tb > ta ? b : a;
  }
  const ua = VISA_EXPIRING_URGENCY[a.eventType] ?? 0;
  const ub = VISA_EXPIRING_URGENCY[b.eventType] ?? 0;
  return ub > ua ? b : a;
}

/**
 * Aynı çalışan için birden fazla vize hatırlatması (90/30/7 gün) varsa
 * yalnızca en acil olanı bırakır (dueDate en geç olan / 7 günlük). Diğer bildirim tipleri aynen kalır.
 */
export function dedupeVisaExpiringByWorker<
  T extends {
    workerId: string;
    eventType: NotificationType;
    dueDate: Date;
    createdAt: Date;
  },
>(rows: T[]): T[] {
  const visaByWorker = new Map<string, T[]>();
  const rest: T[] = [];

  for (const row of rows) {
    if (VISA_EXPIRING_SET.has(row.eventType)) {
      const list = visaByWorker.get(row.workerId) ?? [];
      list.push(row);
      visaByWorker.set(row.workerId, list);
    } else {
      rest.push(row);
    }
  }

  const keptVisa: T[] = [];
  for (const group of Array.from(visaByWorker.values())) {
    if (group.length === 0) continue;
    const best = group.reduce((a, b) => compareVisaExpiringUrgency(a, b));
    keptVisa.push(best);
  }

  return [...rest, ...keptVisa].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}
