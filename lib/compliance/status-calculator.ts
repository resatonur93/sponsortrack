import { addDays, daysBetween, startOfDay } from "@/lib/dates";

/** Vize bitiş hücresi / rozetleri için görsel sınıflandırma */
export type VisaExpiryVisualState = "none" | "ok" | "expiring" | "expired";

const DEFAULT_EXPIRING_WITHIN_DAYS = 90;

/**
 * `visaExpiryDate` yoksa `none`.
 * Geçmiş gün → `expired`.
 * Bugünden itibaren `withinDays` içinde (dahil) → `expiring`.
 * Daha ileri tarih → `ok`.
 */
export function getVisaExpiryVisualState(
  visaExpiryDate: Date | null | undefined,
  now: Date = new Date(),
  withinDays: number = DEFAULT_EXPIRING_WITHIN_DAYS
): VisaExpiryVisualState {
  if (!visaExpiryDate) return "none";
  const d = daysBetween(startOfDay(now), startOfDay(visaExpiryDate));
  if (d < 0) return "expired";
  if (d <= withinDays) return "expiring";
  return "ok";
}

/** Filtre: vize yakında biten (henüz geçmemiş) */
export function visaExpiringPrismaWindow(
  now: Date = new Date(),
  withinDays: number = DEFAULT_EXPIRING_WITHIN_DAYS
): { gte: Date; lte: Date } {
  return {
    gte: startOfDay(now),
    lte: startOfDay(addDays(now, withinDays)),
  };
}

export function isVisaExpired(
  visaExpiryDate: Date | null | undefined,
  now: Date = new Date()
): boolean {
  if (!visaExpiryDate) return false;
  return daysBetween(startOfDay(now), startOfDay(visaExpiryDate)) < 0;
}
