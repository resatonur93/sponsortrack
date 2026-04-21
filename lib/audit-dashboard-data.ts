import type {
  ComplianceRiskLevel,
  EventType,
  NotificationType,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";

type Db = typeof prisma;
import { evaluateMissingDocuments } from "@/lib/required-documents";
import { refreshComplianceEventOverdueStatuses } from "@/lib/compliance-reporting-engine";

export type AuditOverdueRow = {
  id: string;
  kind: "notification" | "compliance" | "sms_draft";
  type: string;
  workerId: string;
  workerName: string;
  deadline: string;
  status: string;
};

export type AuditUpcomingRow = {
  id: string;
  kind: "notification" | "compliance";
  type: string;
  workerId: string;
  workerName: string;
  deadline: string;
  status: string;
};

export type AuditMissingDocRow = {
  workerId: string;
  name: string;
  labels: string[];
  highCount: number;
  mediumCount: number;
  lowCount: number;
};

export type AuditDashboardPayload = {
  stats: {
    totalSponsoredWorkers: number;
    activeSponsorships: number;
    visasExpiring30d: number;
    visasExpiring90dWindow: number;
    overdueReports: number;
    missingDocumentsWorkers: number;
    salaryAnomalyRecords: number;
    salaryAnomalyWorkers: number;
  };
  riskSummary: Record<ComplianceRiskLevel, number>;
  actionRequired: {
    overdueItems: AuditOverdueRow[];
    upcomingDeadlines7d: AuditUpcomingRow[];
    missingDocuments: AuditMissingDocRow[];
  };
  filterOptions: {
    notificationEventTypes: NotificationType[];
    complianceEventTypes: EventType[];
  };
};

const ALL_NOTIFICATION_TYPES: NotificationType[] = [
  "NO_SHOW",
  "UNAUTHORISED_ABSENCE",
  "UNPAID_OR_REDUCED_PAY_ABSENCE",
  "SALARY_REDUCTION",
  "CHANGE_OF_ROLE_OR_DUTIES",
  "PROMOTION_SAME_SOC",
  "WORK_LOCATION_CHANGE",
  "SPONSORSHIP_ENDED",
  "OFFSHORE_ARRIVAL",
  "OFFSHORE_DEPARTURE",
  "ORGANISATION_CHANGE",
  "ADDRESS_CONTACT_UPDATE",
  "ORGANISATION_SIZE_CHANGE",
  "CHARITY_STATUS_CHANGE",
  "KEY_PERSONNEL_CHANGE",
  "MERGER_TUPE_RESTRUCTURING",
  "INSOLVENCY_RELATED",
  "VISA_EXPIRING_90_DAYS",
  "VISA_EXPIRING_30_DAYS",
  "VISA_EXPIRING_7_DAYS",
  "DOCUMENT_EXPIRING",
  "WORKER_MISSING_DOCUMENTS",
  "SALARY_DISCREPANCY",
];

const ALL_COMPLIANCE_EVENT_TYPES: EventType[] = [
  "NO_SHOW_28_DAYS",
  "UNAUTHORISED_ABSENCE_10_DAYS",
  "REDUCED_PAY_ABSENCE",
  "SALARY_REDUCTION",
  "ROLE_CHANGE",
  "PROMOTION_SAME_CODE",
  "WORK_LOCATION_CHANGE",
  "SPONSORSHIP_ENDED",
  "OFFSHORE_ARRIVAL",
  "OFFSHORE_DEPARTURE",
  "ADDRESS_CHANGE",
  "PHONE_CHANGE",
  "EMAIL_CHANGE",
];

function emptyRiskSummary(): Record<ComplianceRiskLevel, number> {
  return { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
}

export async function buildAuditDashboardPayload(
  db: Db,
  tenantId: string
): Promise<AuditDashboardPayload> {
  await refreshComplianceEventOverdueStatuses(tenantId);

  const now = new Date();
  const in7 = new Date(now);
  in7.setDate(in7.getDate() + 7);
  const in30 = new Date(now);
  in30.setDate(in30.getDate() + 30);
  const in90 = new Date(now);
  in90.setDate(in90.getDate() + 90);

  const notTerminated = { employmentStatus: { not: "TERMINATED" as const } };

  const [
    totalSponsoredWorkers,
    activeSponsorships,
    visasExpiring30d,
    visasExpiring90dWindow,
    complianceOverdue,
    notificationOverdue,
    salaryAnomalyRecords,
    salaryAnomalyWorkersRaw,
    riskGroups,
    overdueNotifications,
    overdueCompliance,
    overdueSmsDrafts,
    upcomingCompliance,
    upcomingNotifications,
    workersForDocs,
  ] = await Promise.all([
    db.worker.count({ where: notTerminated }),
    db.worker.count({ where: { employmentStatus: "ACTIVE" } }),
    db.worker.count({
      where: {
        ...notTerminated,
        visaExpiryDate: { not: null, lte: in30, gte: now },
      },
    }),
    db.worker.count({
      where: {
        ...notTerminated,
        visaExpiryDate: { not: null, lte: in90, gte: now },
      },
    }),
    db.complianceEvent.count({ where: { status: "OVERDUE" } }),
    db.notificationEvent.count({ where: { status: "OVERDUE" } }),
    db.salaryRecord.count({ where: { isCompliant: false } }),
    db.salaryRecord.findMany({
      where: { isCompliant: false },
      select: { workerId: true },
      distinct: ["workerId"],
    }),
    db.worker.groupBy({
      by: ["complianceRiskLevel"],
      where: notTerminated,
      _count: { _all: true },
    }),
    db.notificationEvent.findMany({
      where: { status: "OVERDUE" },
      orderBy: { dueDate: "asc" },
      take: 40,
      include: {
        worker: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    }),
    db.complianceEvent.findMany({
      where: { status: "OVERDUE" },
      orderBy: { reportDeadline: "asc" },
      take: 40,
      include: {
        worker: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    }),
    db.smsReportDraft.findMany({
      where: {
        sentToHO: false,
        deadline: { lt: now },
      },
      orderBy: { deadline: "asc" },
      take: 25,
      include: {
        event: {
          select: {
            worker: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
      },
    }),
    db.complianceEvent.findMany({
      where: {
        status: { in: ["PENDING", "UNDER_REVIEW", "APPROVED"] },
        reportDeadline: { gte: now, lte: in7 },
      },
      orderBy: { reportDeadline: "asc" },
      take: 40,
      include: {
        worker: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    }),
    db.notificationEvent.findMany({
      where: {
        status: "PENDING",
        OR: [
          { dueDate: { gte: now, lte: in7 } },
          {
            reportDeadlineAt: {
              gte: now,
              lte: in7,
            },
          },
        ],
      },
      orderBy: { dueDate: "asc" },
      take: 40,
      include: {
        worker: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    }),
    db.worker.findMany({
      where: notTerminated,
      include: {
        documents: { where: { isDeleted: false } },
      },
    }),
  ]);

  const riskSummary = emptyRiskSummary();
  for (const g of riskGroups) {
    riskSummary[g.complianceRiskLevel] = g._count._all;
  }

  const missingRows: AuditMissingDocRow[] = [];
  let missingDocumentsWorkers = 0;
  for (const w of workersForDocs) {
    const miss = evaluateMissingDocuments(w, w.documents, now).filter(
      (m) => m.reason === "missing" || m.reason === "expired"
    );
    if (miss.length === 0) continue;
    missingDocumentsWorkers += 1;
    missingRows.push({
      workerId: w.id,
      name: `${w.firstName} ${w.lastName}`,
      labels: miss.map((m) => m.label),
      highCount: miss.filter((m) => m.urgency === "HIGH").length,
      mediumCount: miss.filter((m) => m.urgency === "MEDIUM").length,
      lowCount: miss.filter((m) => m.urgency === "LOW").length,
    });
  }
  missingRows.sort((a, b) => {
    if (b.highCount !== a.highCount) return b.highCount - a.highCount;
    if (b.mediumCount !== a.mediumCount) return b.mediumCount - a.mediumCount;
    return a.name.localeCompare(b.name);
  });

  const overdueItems: AuditOverdueRow[] = [
    ...overdueNotifications.map((n) => ({
      id: n.id,
      kind: "notification" as const,
      type: n.eventType,
      workerId: n.workerId,
      workerName: `${n.worker.firstName} ${n.worker.lastName}`,
      deadline: n.dueDate.toISOString(),
      status: n.status,
    })),
    ...overdueCompliance.map((e) => ({
      id: e.id,
      kind: "compliance" as const,
      type: e.eventType,
      workerId: e.workerId,
      workerName: `${e.worker.firstName} ${e.worker.lastName}`,
      deadline: e.reportDeadline.toISOString(),
      status: e.status,
    })),
    ...overdueSmsDrafts.map((d) => ({
      id: d.id,
      kind: "sms_draft" as const,
      type: "SMS_DRAFT",
      workerId: d.event.worker.id,
      workerName: `${d.event.worker.firstName} ${d.event.worker.lastName}`,
      deadline: d.deadline.toISOString(),
      status: d.approvedAt ? "APPROVED_PENDING_SEND" : "DRAFT",
    })),
  ].sort(
    (a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
  );

  const upcomingDeadlines7d: AuditUpcomingRow[] = [
    ...upcomingCompliance.map((e) => ({
      id: e.id,
      kind: "compliance" as const,
      type: e.eventType,
      workerId: e.workerId,
      workerName: `${e.worker.firstName} ${e.worker.lastName}`,
      deadline: e.reportDeadline.toISOString(),
      status: e.status,
    })),
    ...upcomingNotifications.map((n) => {
      const dl = n.reportDeadlineAt ?? n.dueDate;
      return {
        id: n.id,
        kind: "notification" as const,
        type: n.eventType,
        workerId: n.workerId,
        workerName: `${n.worker.firstName} ${n.worker.lastName}`,
        deadline: dl.toISOString(),
        status: n.status,
      };
    }),
  ].sort(
    (a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
  );

  return {
    stats: {
      totalSponsoredWorkers,
      activeSponsorships,
      visasExpiring30d,
      visasExpiring90dWindow,
      overdueReports: complianceOverdue + notificationOverdue,
      missingDocumentsWorkers,
      salaryAnomalyRecords,
      salaryAnomalyWorkers: salaryAnomalyWorkersRaw.length,
    },
    riskSummary,
    actionRequired: {
      overdueItems: overdueItems.slice(0, 50),
      upcomingDeadlines7d: upcomingDeadlines7d.slice(0, 50),
      missingDocuments: missingRows.slice(0, 40),
    },
    filterOptions: {
      notificationEventTypes: ALL_NOTIFICATION_TYPES,
      complianceEventTypes: ALL_COMPLIANCE_EVENT_TYPES,
    },
  };
}
