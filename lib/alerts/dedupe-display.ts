import type { AlertLevel, AlertType } from "@prisma/client";

/** Görünüm sırasına göre (önce daha yüksek risk). */
const LEVEL_RANK: Record<AlertLevel, number> = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
};

export type AlertForDedupe = {
  workerId: string | null;
  alertType: AlertType;
  level: AlertLevel;
  createdAt: Date;
};

/**
 * Tabloda aynı çalışan + aynı `alertType` için yalnızca en yüksek seviyeli satırı bırakır
 * (ör. `ne:*` ve `visa:*` birlikte şişkin görünümü azaltır).
 */
export function dedupeAlertsByWorkerAndType<T extends AlertForDedupe>(rows: T[]): T[] {
  const best = new Map<string, T>();
  for (const row of rows) {
    const wid = row.workerId ?? "__none__";
    const k = `${wid}::${row.alertType}`;
    const prev = best.get(k);
    if (!prev) {
      best.set(k, row);
      continue;
    }
    const rNew = LEVEL_RANK[row.level];
    const rOld = LEVEL_RANK[prev.level];
    if (rNew > rOld) best.set(k, row);
    else if (rNew === rOld && row.createdAt > prev.createdAt) best.set(k, row);
  }
  return Array.from(best.values()).sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  );
}
