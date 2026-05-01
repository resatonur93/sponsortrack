import type { AlertLevel, AlertType, NotificationType } from "@prisma/client";
import type { RiskLevel } from "@prisma/client";
import type { PrismaTenantClient } from "@/lib/prisma";
import type { DashboardSummary } from "@/lib/compliance/types";
import { getComplianceDashboardSummary } from "@/lib/compliance/dashboard-summary";
import { computeRiskScore } from "@/lib/risk-score";
import { evaluateMissingDocuments } from "@/lib/required-documents";
import {
  VISA_EXPIRING_TYPES,
  dedupeVisaExpiringByWorker,
} from "@/lib/recent-notifications";

export type DashboardPayload = {
  stats: {
    totalWorkers: number;
    activeSponsorships: number;
    pendingNotifications: number;
    overdueNotifications: number;
    missingDocumentIssues: number;
  };
  highPriorityMissing: {
    workerId: string;
    name: string;
    labels: string[];
  }[];
  missingDocumentsTable: {
    workerId: string;
    name: string;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    labels: string[];
  }[];
  risk: ReturnType<typeof computeRiskScore>;
  recentEvents: {
    id: string;
    eventType: NotificationType;
    status: string;
    dueDate: string;
    createdAt?: string;
    worker: { firstName: string; lastName: string; id: string };
  }[];
  recentAlerts: {
    id: string;
    level: AlertLevel;
    alertType: AlertType;
    message: string;
    isRead: boolean;
    worker: { id: string; firstName: string; lastName: string } | null;
  }[];
};

export type RiskEngineSummary = {
  byLevel: Record<RiskLevel, number>;
  workerScores: number;
  lastCalculatedAt: Date | string | null;
};

export type FullDashboardData = DashboardPayload & {
  complianceTraffic: DashboardSummary;
  riskEngine: RiskEngineSummary;
};

type DashboardCoreBundle = {
  payload: DashboardPayload;
  riskEngine: RiskEngineSummary;
};

async function loadDashboardCore(
  prisma: PrismaTenantClient,
  now: Date
): Promise<DashboardCoreBundle> {
  const in30 = new Date(now);
  in30.setDate(in30.getDate() + 30);
  const in90 = new Date(now);
  in90.setDate(in90.getDate() + 90);

  const [
    totalWorkers,
    activeWorkers,
    notifications,
    visaAlertRows,
    nonVisaRecentRows,
    visa30,
    visa90not30,
    recentAlerts,
    groupedRisk,
    orgRow,
    latestWorkerRisk,
    workerScores,
  ] = await Promise.all([
    prisma.worker.count(),
    prisma.worker.count({ where: { employmentStatus: "ACTIVE" } }),
    prisma.notificationEvent.findMany({
      where: { status: { in: ["PENDING", "OVERDUE"] } },
      select: { status: true },
    }),
    prisma.notificationEvent.findMany({
      where: {
        status: { in: ["PENDING", "OVERDUE"] },
        eventType: { in: VISA_EXPIRING_TYPES },
      },
      include: {
        worker: {
          select: { firstName: true, lastName: true, id: true },
        },
      },
    }),
    prisma.notificationEvent.findMany({
      where: { eventType: { notIn: VISA_EXPIRING_TYPES } },
      orderBy: { createdAt: "desc" },
      take: 15,
      include: {
        worker: {
          select: { firstName: true, lastName: true, id: true },
        },
      },
    }),
    prisma.worker.count({
      where: {
        visaExpiryDate: { not: null, lte: in30, gte: now },
        employmentStatus: { not: "TERMINATED" },
      },
    }),
    prisma.worker.count({
      where: {
        visaExpiryDate: { not: null, gt: in30, lte: in90 },
        employmentStatus: { not: "TERMINATED" },
      },
    }),
    prisma.alert.findMany({
      where: { dismissedAt: null },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        worker: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    }),
    prisma.riskScore.groupBy({
      by: ["level"],
      where: { isTenantAggregate: false },
      _count: { _all: true },
    }),
    prisma.riskScore.findFirst({
      where: { isTenantAggregate: true },
      orderBy: { calculatedAt: "desc" },
    }),
    prisma.riskScore.findFirst({
      where: { isTenantAggregate: false },
      orderBy: { calculatedAt: "desc" },
      select: { calculatedAt: true },
    }),
    prisma.riskScore.count({ where: { isTenantAggregate: false } }),
  ]);

  const risk = computeRiskScore({
    notifications,
    workersWithVisaExpiringIn30Days: visa30,
    workersWithVisaExpiringIn90DaysNot30: visa90not30,
  });

  const workersForDocs = await prisma.worker.findMany({
    where: { employmentStatus: { not: "TERMINATED" } },
    include: {
      documents: { where: { isDeleted: false } },
    },
  });

  let missingDocumentIssues = 0;
  const highPriorityMissing: DashboardPayload["highPriorityMissing"] = [];
  const missingDocumentsTable: DashboardPayload["missingDocumentsTable"] =
    [];

  for (const w of workersForDocs) {
    const missAll = evaluateMissingDocuments(w, w.documents, now);
    missingDocumentIssues += missAll.length;
    const highs = missAll.filter((m) => m.urgency === "HIGH");
    if (highs.length > 0) {
      highPriorityMissing.push({
        workerId: w.id,
        name: `${w.firstName} ${w.lastName}`,
        labels: highs.map((h) => h.label),
      });
    }
    if (missAll.length > 0) {
      missingDocumentsTable.push({
        workerId: w.id,
        name: `${w.firstName} ${w.lastName}`,
        highCount: missAll.filter((m) => m.urgency === "HIGH").length,
        mediumCount: missAll.filter((m) => m.urgency === "MEDIUM").length,
        lowCount: missAll.filter((m) => m.urgency === "LOW").length,
        labels: missAll.map((m) => m.label),
      });
    }
  }

  missingDocumentsTable.sort((a, b) => {
    if (b.highCount !== a.highCount) return b.highCount - a.highCount;
    if (b.mediumCount !== a.mediumCount) return b.mediumCount - a.mediumCount;
    if (b.lowCount !== a.lowCount) return b.lowCount - a.lowCount;
    return a.name.localeCompare(b.name);
  });

  const visaDeduped = dedupeVisaExpiringByWorker(visaAlertRows);
  const recentForDashboard = [...visaDeduped, ...nonVisaRecentRows]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, 10);

  const recentEvents: DashboardPayload["recentEvents"] =
    recentForDashboard.map((r) => ({
      id: r.id,
      eventType: r.eventType,
      status: r.status,
      dueDate:
        r.dueDate instanceof Date ? r.dueDate.toISOString() : String(r.dueDate),
      createdAt:
        r.createdAt instanceof Date
          ? r.createdAt.toISOString()
          : r.createdAt ?? undefined,
      worker: r.worker,
    }));

  const byLevel: Record<RiskLevel, number> = {
    LOW: 0,
    MEDIUM: 0,
    HIGH: 0,
    CRITICAL: 0,
  };
  for (const g of groupedRisk) {
    byLevel[g.level] = g._count._all;
  }

  const riskEngine: RiskEngineSummary = {
    byLevel,
    workerScores,
    lastCalculatedAt:
      latestWorkerRisk?.calculatedAt ?? orgRow?.calculatedAt ?? null,
  };

  const payload: DashboardPayload = {
    stats: {
      totalWorkers,
      activeSponsorships: activeWorkers,
      pendingNotifications: notifications.filter((n) => n.status === "PENDING")
        .length,
      overdueNotifications: notifications.filter((n) => n.status === "OVERDUE")
        .length,
      missingDocumentIssues,
    },
    highPriorityMissing: highPriorityMissing.slice(0, 12),
    missingDocumentsTable: missingDocumentsTable.slice(0, 20),
    risk,
    recentEvents,
    recentAlerts,
  };

  return { payload, riskEngine };
}

/** Eski `/api/dashboard` yanıtı — uyum trafiği hesaplanmaz. */
export async function buildLegacyDashboardPayload(
  prisma: PrismaTenantClient,
  now: Date = new Date()
): Promise<DashboardPayload> {
  const { payload } = await loadDashboardCore(prisma, now);
  return payload;
}

export async function buildFullDashboard(
  prisma: PrismaTenantClient,
  tenantId: string,
  now: Date = new Date()
): Promise<FullDashboardData> {
  const [complianceTraffic, core] = await Promise.all([
    getComplianceDashboardSummary(tenantId, prisma, now),
    loadDashboardCore(prisma, now),
  ]);
  return {
    complianceTraffic,
    riskEngine: core.riskEngine,
    ...core.payload,
  };
}
