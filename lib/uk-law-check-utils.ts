import type { UkLawCheck } from "@prisma/client";
import { Prisma } from "@prisma/client";

export type SerializedUkLawCheck = Omit<
  UkLawCheck,
  | "hourlyRate"
  | "hoursPerWeek"
  | "weeklyHours"
  | "maxWeeklyHours"
  | "annualEntitlement"
  | "daysTaken"
  | "daysRemaining"
  | "contractIssued"
  | "createdAt"
  | "updatedAt"
> & {
  hourlyRate: string | null;
  hoursPerWeek: string | null;
  weeklyHours: string | null;
  maxWeeklyHours: string;
  annualEntitlement: string;
  daysTaken: string | null;
  daysRemaining: string | null;
  contractIssued: string | null;
  createdAt: string;
  updatedAt: string;
};

export function serializeUkLawCheck(row: UkLawCheck): SerializedUkLawCheck {
  return {
    id: row.id,
    workerId: row.workerId,
    nmwCompliant: row.nmwCompliant,
    hourlyRate: row.hourlyRate?.toString() ?? null,
    hoursPerWeek: row.hoursPerWeek?.toString() ?? null,
    weeklyHours: row.weeklyHours?.toString() ?? null,
    maxWeeklyHours: row.maxWeeklyHours.toString(),
    optOutSigned: row.optOutSigned,
    annualEntitlement: row.annualEntitlement.toString(),
    daysTaken: row.daysTaken?.toString() ?? null,
    daysRemaining: row.daysRemaining?.toString() ?? null,
    contractIssued: row.contractIssued ? row.contractIssued.toISOString() : null,
    contractType: row.contractType,
    flags: row.flags,
    tenantId: row.tenantId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toDec(
  v: number | string | null | undefined
): Prisma.Decimal | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;
  return new Prisma.Decimal(String(v));
}

export function anomalyReasonsForCheck(check: UkLawCheck): string[] {
  const reasons: string[] = [];
  for (const f of check.flags) {
    reasons.push(f);
  }
  if (check.nmwCompliant === false) {
    reasons.push("nmw_non_compliant");
  }
  const wk = check.weeklyHours ? Number(check.weeklyHours) : null;
  const cap = Number(check.maxWeeklyHours);
  if (
    wk !== null &&
    !Number.isNaN(wk) &&
    !check.optOutSigned &&
    (wk > 48 || wk > cap)
  ) {
    reasons.push("hours_exceeded");
  }
  const rem = check.daysRemaining ? Number(check.daysRemaining) : null;
  if (rem !== null && !Number.isNaN(rem) && rem < 0) {
    reasons.push("holiday_deficit");
  }
  return Array.from(new Set(reasons));
}

export function hasUkLawAnomaly(check: UkLawCheck): boolean {
  return anomalyReasonsForCheck(check).length > 0;
}
