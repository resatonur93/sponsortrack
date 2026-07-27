import type { AlertLevel, AlertType, NotificationType, Role } from "@prisma/client";
import type { RiskLevel } from "@prisma/client";
import { Prisma } from "@prisma/client";
import type { PrismaTenantClient } from "@/lib/prisma";
import type { DashboardSummary } from "@/lib/compliance/types";
import { getComplianceDashboardSummary } from "@/lib/compliance/dashboard-summary";
import { computeRiskScore } from "@/lib/risk-score";
import { evaluateMissingDocuments } from "@/lib/required-documents";
import { hasDisallowedDeduction, parseDeductions } from "@/lib/salary-record-utils";
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

export type RecordKeepingSummary = {
  keyPersonnel: { id: string; firstName: string; lastName: string; role: Role }[];
  recruitment: { draft: number; underReview: number; approved: number };
  rtwSummary: { overdue: number; dueSoon: number };
  payrollAttendance: {
    salaryAnomalies: number;
    openAbsenceIssues: number;
    missingEvidenceCount: number;
    disallowedDeductionCount: number;
  };
  smsReporting: { draft: number; approved: number; sent: number };
  auditHistory: { recentCount: number; lastEntryAt: string | null };
};

export type LicenceOverview = {
  companyName: string;
  licenceNumber: string;
  licenceType: string | null;
  licenceRating: string | null;
  licenceExpiryDate: string | null;
};

export type FullDashboardData = DashboardPayload &
  RecordKeepingSummary & {
    complianceTraffic: DashboardSummary;
    riskEngine: RiskEngineSummary;
    licence: LicenceOverview | null;
  };

type DashboardCoreBundle = {
  payload: DashboardPayload;
  riskEngine: RiskEngineSummary;
  recordKeeping: RecordKeepingSummary;
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
    keyPersonnelRows,
    vacancyGroups,
    rtwChecks,
    salaryAnomalies,
    openAbsenceIssues,
    smsDrafts,
    auditRecentCount,
    latestAuditEntry,
    missingEvidenceCount,
    salaryRecordsForDeductionCheck,
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
    prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, firstName: true, lastName: true, role: true },
      orderBy: [{ role: "asc" }, { lastName: "asc" }],
    }),
    prisma.vacancy.groupBy({
      by: ["status"],
      where: { status: { in: ["DRAFT", "UNDER_REVIEW", "APPROVED"] } },
      _count: { _all: true },
    }),
    prisma.rightToWorkCheck.findMany({
      where: { nextCheckDueAt: { not: null } },
      orderBy: { checkedAt: "desc" },
      select: { workerId: true, nextCheckDueAt: true },
    }),
    prisma.salaryRecord.count({ where: { isCompliant: false } }),
    prisma.absenceRecord.count({ where: { isReportable: true, status: "ACTIVE" } }),
    prisma.smsReportDraft.findMany({
      select: { approvedAt: true, sentToHO: true },
    }),
    prisma.auditLog.count({
      where: { createdAt: { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) } },
    }),
    prisma.auditLog.findFirst({
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
    prisma.salaryRecord.count({
      where: { OR: [{ evidenceUrl: null }, { evidenceUrl: "" }] },
    }),
    prisma.salaryRecord.findMany({
      where: { deductions: { not: Prisma.JsonNull } },
      select: { deductions: true },
      take: 2000,
    }),
  ]);

  const disallowedDeductionCount = salaryRecordsForDeductionCheck.filter((r) =>
    hasDisallowedDeduction(parseDeductions(r.deductions))
  ).length;

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
    take: 500,
    orderBy: { createdAt: "desc" },
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

  const latestRtwByWorker = new Map<string, Date>();
  for (const c of rtwChecks) {
    if (!c.nextCheckDueAt) continue;
    if (!latestRtwByWorker.has(c.workerId)) {
      latestRtwByWorker.set(c.workerId, c.nextCheckDueAt);
    }
  }
  const in30ForRtw = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  let rtwOverdue = 0;
  let rtwDueSoon = 0;
  for (const due of Array.from(latestRtwByWorker.values())) {
    if (due.getTime() < now.getTime()) rtwOverdue += 1;
    else if (due.getTime() <= in30ForRtw.getTime()) rtwDueSoon += 1;
  }

  let smsDraft = 0;
  let smsApproved = 0;
  let smsSent = 0;
  for (const d of smsDrafts) {
    if (d.sentToHO) smsSent += 1;
    else if (d.approvedAt) smsApproved += 1;
    else smsDraft += 1;
  }

  const vacancyCountFor = (status: string): number =>
    vacancyGroups.find((g) => g.status === status)?._count._all ?? 0;

  const recordKeeping: RecordKeepingSummary = {
    keyPersonnel: keyPersonnelRows,
    recruitment: {
      draft: vacancyCountFor("DRAFT"),
      underReview: vacancyCountFor("UNDER_REVIEW"),
      approved: vacancyCountFor("APPROVED"),
    },
    rtwSummary: { overdue: rtwOverdue, dueSoon: rtwDueSoon },
    payrollAttendance: {
      salaryAnomalies,
      openAbsenceIssues,
      missingEvidenceCount,
      disallowedDeductionCount,
    },
    smsReporting: { draft: smsDraft, approved: smsApproved, sent: smsSent },
    auditHistory: {
      recentCount: auditRecentCount,
      lastEntryAt: latestAuditEntry?.createdAt
        ? latestAuditEntry.createdAt.toISOString()
        : null,
    },
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

  return { payload, riskEngine, recordKeeping };
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
  const [complianceTraffic, core, tenantRow] = await Promise.all([
    getComplianceDashboardSummary(tenantId, prisma, now),
    loadDashboardCore(prisma, now),
    prisma.tenant.findUnique({ where: { id: tenantId } }),
  ]);
  const licence: LicenceOverview | null = tenantRow
    ? {
        companyName: tenantRow.companyName,
        licenceNumber: tenantRow.licenceNumber,
        licenceType: tenantRow.licenceType,
        licenceRating: tenantRow.licenceRating,
        licenceExpiryDate: tenantRow.licenceExpiryDate
          ? tenantRow.licenceExpiryDate.toISOString()
          : null,
      }
    : null;
  return {
    complianceTraffic,
    riskEngine: core.riskEngine,
    licence,
    ...core.payload,
    ...core.recordKeeping,
  };
}
