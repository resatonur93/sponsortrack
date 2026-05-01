import type { NotificationStatus, NotificationType } from "@prisma/client";
import type { PrismaTenantClient } from "@/lib/prisma";
import { daysBetween, startOfDay } from "@/lib/dates";
import { evaluateMissingDocuments } from "@/lib/required-documents";
import { VISA_EXPIRING_TYPES } from "@/lib/recent-notifications";

export type ComplianceTrafficCategoryId =
  | "visa"
  | "sponsorship"
  | "rightToWork"
  | "documents";

export type ComplianceTrafficSeverity = "critical" | "warning";

export type ComplianceTrafficItem = {
  workerId: string;
  workerName: string;
  detail: string;
  severity: ComplianceTrafficSeverity;
};

export type ComplianceTrafficCategory = {
  id: ComplianceTrafficCategoryId;
  trafficLight: "green" | "amber" | "red";
  criticalCount: number;
  warningCount: number;
  items: ComplianceTrafficItem[];
};

export type ComplianceTrafficStatusPayload = {
  generatedAt: string;
  categories: ComplianceTrafficCategory[];
};

const VISA_SET = new Set<NotificationType>(VISA_EXPIRING_TYPES);

const SPONSORSHIP_NOTIF = new Set<NotificationType>([
  "SPONSORSHIP_ENDING_60_DAYS",
  "SPONSORSHIP_ENDING_30_DAYS",
  "SPONSORSHIP_ENDING_7_DAYS",
  "SPONSORSHIP_ENDED",
]);

const RTW_NOTIF = new Set<NotificationType>([
  "RIGHT_TO_WORK_RECHECK_60_DAYS",
  "RIGHT_TO_WORK_RECHECK_30_DAYS",
  "RIGHT_TO_WORK_RECHECK_7_DAYS",
]);

const DOC_NOTIF = new Set<NotificationType>([
  "DOCUMENT_EXPIRING",
  "WORKER_MISSING_DOCUMENTS",
]);

type Acc = {
  name: string;
  severity: ComplianceTrafficSeverity;
  details: string[];
};

function upsertIssue(
  map: Map<string, Acc>,
  workerId: string,
  name: string,
  severity: ComplianceTrafficSeverity,
  detail: string
): void {
  const prev = map.get(workerId);
  if (!prev) {
    map.set(workerId, { name, severity, details: [detail] });
    return;
  }
  if (!prev.details.includes(detail)) prev.details.push(detail);
  if (severity === "critical") prev.severity = "critical";
  else if (prev.severity !== "critical") prev.severity = "warning";
}

function mapToItems(map: Map<string, Acc>): ComplianceTrafficItem[] {
  return Array.from(map.entries())
    .map(([workerId, v]) => ({
      workerId,
      workerName: v.name,
      detail: v.details.join(" · "),
      severity: v.severity,
    }))
    .sort((a, b) => {
      if (a.severity !== b.severity) {
        return a.severity === "critical" ? -1 : 1;
      }
      return a.workerName.localeCompare(b.workerName);
    });
}

function summarize(
  map: Map<string, Acc>
): Pick<ComplianceTrafficCategory, "trafficLight" | "criticalCount" | "warningCount" | "items"> {
  const items = mapToItems(map);
  const criticalCount = items.filter((i) => i.severity === "critical").length;
  const warningCount = items.filter((i) => i.severity === "warning").length;
  const trafficLight: "green" | "amber" | "red" =
    criticalCount > 0 ? "red" : warningCount > 0 ? "amber" : "green";
  return { trafficLight, criticalCount, warningCount, items };
}

function notifSeverity(
  status: NotificationStatus,
  type: NotificationType,
  visa: boolean,
  rtw: boolean,
  sponsor: boolean,
  doc: boolean
): ComplianceTrafficSeverity | null {
  if (status !== "PENDING" && status !== "OVERDUE") return null;
  if (status === "OVERDUE") return "critical";
  if (visa) {
    if (type === "VISA_EXPIRING_7_DAYS") return "critical";
    if (
      type === "VISA_EXPIRING_30_DAYS" ||
      type === "VISA_EXPIRING_60_DAYS" ||
      type === "VISA_EXPIRING_90_DAYS"
    ) {
      return "warning";
    }
  }
  if (rtw) {
    if (type === "RIGHT_TO_WORK_RECHECK_7_DAYS") return "critical";
    if (
      type === "RIGHT_TO_WORK_RECHECK_30_DAYS" ||
      type === "RIGHT_TO_WORK_RECHECK_60_DAYS"
    ) {
      return "warning";
    }
  }
  if (sponsor) {
    if (type === "SPONSORSHIP_ENDING_7_DAYS" || type === "SPONSORSHIP_ENDED") {
      return "critical";
    }
    if (
      type === "SPONSORSHIP_ENDING_30_DAYS" ||
      type === "SPONSORSHIP_ENDING_60_DAYS"
    ) {
      return "warning";
    }
  }
  if (doc) {
    if (type === "WORKER_MISSING_DOCUMENTS") return "warning";
    if (type === "DOCUMENT_EXPIRING") return "warning";
  }
  return null;
}

/**
 * Tenant-scoped Prisma client (withTenant içinde çağrılmalı).
 */
export async function computeComplianceTrafficStatus(
  db: PrismaTenantClient,
  now: Date = new Date()
): Promise<ComplianceTrafficStatusPayload> {
  const visaMap = new Map<string, Acc>();
  const sponsorMap = new Map<string, Acc>();
  const rtwMap = new Map<string, Acc>();
  const docMap = new Map<string, Acc>();

  const workers = await db.worker.findMany({
    where: { employmentStatus: { not: "TERMINATED" } },
    include: {
      documents: { where: { isDeleted: false } },
      rtwChecks: {
        where: { nextCheckDueAt: { not: null } },
        orderBy: { nextCheckDueAt: "asc" },
        take: 1,
        select: { nextCheckDueAt: true },
      },
    },
  });

  const notifs = await db.notificationEvent.findMany({
    where: { status: { in: ["PENDING", "OVERDUE"] } },
    select: {
      workerId: true,
      eventType: true,
      status: true,
    },
  });

  const nameOf = (w: (typeof workers)[number]) =>
    `${w.firstName} ${w.lastName}`.trim();

  for (const w of workers) {
    const nm = nameOf(w);

    if (w.visaExpiryDate) {
      const exp = w.visaExpiryDate;
      const days = daysBetween(startOfDay(now), startOfDay(exp));
      if (days < 0) {
        upsertIssue(visaMap, w.id, nm, "critical", "Visa expired");
      } else if (days <= 7) {
        upsertIssue(
          visaMap,
          w.id,
          nm,
          "critical",
          `Visa expires in ${days} day(s)`
        );
      } else if (days <= 30) {
        upsertIssue(
          visaMap,
          w.id,
          nm,
          "warning",
          `Visa expires in ${days} day(s)`
        );
      } else if (days <= 90) {
        upsertIssue(
          visaMap,
          w.id,
          nm,
          "warning",
          `Visa expires in ${days} day(s)`
        );
      }
    }

    const cos = w.cosExpiryDate;
    const cosDays = daysBetween(startOfDay(now), startOfDay(cos));
    if (cosDays < 0) {
      upsertIssue(sponsorMap, w.id, nm, "critical", "CoS expired");
    } else if (cosDays <= 7) {
      upsertIssue(
        sponsorMap,
        w.id,
        nm,
        "critical",
        `CoS expires in ${cosDays} day(s)`
      );
    } else if (cosDays <= 30) {
      upsertIssue(
        sponsorMap,
        w.id,
        nm,
        "warning",
        `CoS expires in ${cosDays} day(s)`
      );
    } else if (cosDays <= 90) {
      upsertIssue(
        sponsorMap,
        w.id,
        nm,
        "warning",
        `CoS expires in ${cosDays} day(s)`
      );
    }

    if (w.sponsorshipEndDate) {
      const sd = daysBetween(startOfDay(now), startOfDay(w.sponsorshipEndDate));
      if (sd < 0) {
        upsertIssue(sponsorMap, w.id, nm, "critical", "Sponsorship end date passed");
      } else if (sd <= 7) {
        upsertIssue(
          sponsorMap,
          w.id,
          nm,
          "critical",
          `Sponsorship ends in ${sd} day(s)`
        );
      } else if (sd <= 60) {
        upsertIssue(
          sponsorMap,
          w.id,
          nm,
          "warning",
          `Sponsorship ends in ${sd} day(s)`
        );
      }
    }

    const nextRtw = w.rtwChecks[0]?.nextCheckDueAt;
    if (nextRtw) {
      const rtwD = daysBetween(startOfDay(now), startOfDay(nextRtw));
      if (rtwD < 0) {
        upsertIssue(rtwMap, w.id, nm, "critical", "Right to Work check overdue");
      } else if (rtwD <= 7) {
        upsertIssue(
          rtwMap,
          w.id,
          nm,
          "critical",
          `RTW due in ${rtwD} day(s)`
        );
      } else if (rtwD <= 30) {
        upsertIssue(
          rtwMap,
          w.id,
          nm,
          "warning",
          `RTW due in ${rtwD} day(s)`
        );
      } else if (rtwD <= 60) {
        upsertIssue(
          rtwMap,
          w.id,
          nm,
          "warning",
          `RTW due in ${rtwD} day(s)`
        );
      }
    }

    if (!nextRtw && !w.rightToWorkLastCheckedAt && w.employmentStatus === "ACTIVE") {
      upsertIssue(
        rtwMap,
        w.id,
        nm,
        "warning",
        "No RTW check on file"
      );
    }

    const missing = evaluateMissingDocuments(w, w.documents, now);
    for (const m of missing) {
      const sev: ComplianceTrafficSeverity =
        m.urgency === "HIGH"
          ? "critical"
          : m.urgency === "MEDIUM"
            ? "warning"
            : "warning";
      upsertIssue(docMap, w.id, nm, sev, m.label);
    }

    for (const d of w.documents) {
      if (!d.expiryDate) continue;
      const ed = daysBetween(startOfDay(now), startOfDay(d.expiryDate));
      if (ed < 0) {
        upsertIssue(docMap, w.id, nm, "critical", `Expired: ${d.fileName}`);
      } else if (ed <= 30) {
        upsertIssue(
          docMap,
          w.id,
          nm,
          "warning",
          `Expires in ${ed}d: ${d.fileName}`
        );
      }
    }
  }

  for (const n of notifs) {
    const w = workers.find((x) => x.id === n.workerId);
    if (!w) continue;
    const nm = nameOf(w);
    const t = n.eventType;

    if (VISA_SET.has(t)) {
      const sev = notifSeverity(n.status, t, true, false, false, false);
      if (sev) {
        upsertIssue(visaMap, w.id, nm, sev, `Notification: ${t.replace(/_/g, " ")}`);
      }
    } else if (SPONSORSHIP_NOTIF.has(t)) {
      const sev = notifSeverity(n.status, t, false, false, true, false);
      if (sev) {
        upsertIssue(
          sponsorMap,
          w.id,
          nm,
          sev,
          `Notification: ${t.replace(/_/g, " ")}`
        );
      }
    } else if (RTW_NOTIF.has(t)) {
      const sev = notifSeverity(n.status, t, false, true, false, false);
      if (sev) {
        upsertIssue(
          rtwMap,
          w.id,
          nm,
          sev,
          `Notification: ${t.replace(/_/g, " ")}`
        );
      }
    } else if (DOC_NOTIF.has(t)) {
      const sev = notifSeverity(n.status, t, false, false, false, true);
      if (sev) {
        upsertIssue(
          docMap,
          w.id,
          nm,
          sev,
          `Notification: ${t.replace(/_/g, " ")}`
        );
      }
    }
  }

  const visa = summarize(visaMap);
  const sponsorship = summarize(sponsorMap);
  const rightToWork = summarize(rtwMap);
  const documents = summarize(docMap);

  return {
    generatedAt: now.toISOString(),
    categories: [
      { id: "visa", ...visa },
      { id: "sponsorship", ...sponsorship },
      { id: "rightToWork", ...rightToWork },
      { id: "documents", ...documents },
    ],
  };
}
