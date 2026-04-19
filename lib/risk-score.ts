import type { NotificationStatus } from "@prisma/client";

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

export type RiskResult = {
  score: number;
  level: RiskLevel;
  breakdown: {
    overdueCount: number;
    overduePoints: number;
    pendingCount: number;
    pendingPoints: number;
    visa30Points: number;
    visa90Points: number;
    forcedHighFromOverdue: boolean;
  };
};

export function computeRiskScore(input: {
  notifications: {
    status: NotificationStatus;
  }[];
  workersWithVisaExpiringIn30Days: number;
  workersWithVisaExpiringIn90DaysNot30: number;
}): RiskResult {
  let overdueCount = 0;
  let pendingCount = 0;
  for (const n of input.notifications) {
    if (n.status === "OVERDUE") overdueCount += 1;
    else if (n.status === "PENDING") pendingCount += 1;
  }
  const overduePoints = overdueCount * 10;
  const pendingPoints = pendingCount * 2;
  const visa30Points = input.workersWithVisaExpiringIn30Days * 5;
  const visa90Points = input.workersWithVisaExpiringIn90DaysNot30 * 2;
  const forcedHighFromOverdue = overdueCount > 0;
  const score =
    overduePoints +
    pendingPoints +
    visa30Points +
    visa90Points;

  let level: RiskLevel = "LOW";
  if (forcedHighFromOverdue || score >= 20) {
    level = "HIGH";
  } else if (score >= 10) {
    level = "MEDIUM";
  }

  return {
    score,
    level,
    breakdown: {
      overdueCount,
      overduePoints,
      pendingCount,
      pendingPoints,
      visa30Points,
      visa90Points,
      forcedHighFromOverdue,
    },
  };
}
