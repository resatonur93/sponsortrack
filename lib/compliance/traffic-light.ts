import type { NotificationStatus, NotificationType } from "@prisma/client";
import type { PrismaTenantClient } from "@/lib/prisma";
import { daysBetween, startOfDay } from "@/lib/dates";
import { evaluateMissingDocuments } from "./checklist";
import { VISA_EXPIRING_TYPES } from "@/lib/recent-notifications";
import type {
  ComplianceAggregateRow,
  ComplianceCategory,
  GroupedComplianceItem,
  ComplianceIssueLine,
  ComplianceTrafficSeverity,
  DashboardSummary,
  TrafficLightCardData,
  TrafficLightScore,
  TrafficLightState,
} from "./types";

const DETAIL_HREF: Record<ComplianceCategory, string> = {
  visa: "/notifications",
  sponsorship: "/notifications",
  rightToWork: "/notifications",
  documents: "/workers",
};

/** Rozet sırası — kartlar ile aynı */
const CATEGORY_DISPLAY_ORDER: readonly ComplianceCategory[] = [
  "visa",
  "sponsorship",
  "rightToWork",
  "documents",
] as const;

function sortCategoriesForUi(cats: ComplianceCategory[]): ComplianceCategory[] {
  return [...cats].sort(
    (a, b) =>
      CATEGORY_DISPLAY_ORDER.indexOf(a) - CATEGORY_DISPLAY_ORDER.indexOf(b)
  );
}

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

type WorkerAcc = {
  name: string;
  lines: ComplianceIssueLine[];
};

function severityRank(s: ComplianceTrafficSeverity): number {
  return s === "critical" ? 0 : 1;
}

function dedupeSortedLines(lines: ComplianceIssueLine[]): ComplianceIssueLine[] {
  const seen = new Set<string>();
  const out: ComplianceIssueLine[] = [];
  for (const l of lines) {
    if (seen.has(l.key)) continue;
    seen.add(l.key);
    out.push(l);
  }
  out.sort((a, b) => {
    const ra = severityRank(a.severity);
    const rb = severityRank(b.severity);
    if (ra !== rb) return ra - rb;
    return a.tr.localeCompare(b.tr);
  });
  return out;
}

function upsertLine(
  map: Map<string, WorkerAcc>,
  workerId: string,
  name: string,
  line: ComplianceIssueLine
): void {
  const prev = map.get(workerId);
  if (!prev) {
    map.set(workerId, { name, lines: [line] });
    return;
  }
  if (!prev.lines.some((x) => x.key === line.key)) prev.lines.push(line);
}

function toGroupedPerson(
  workerId: string,
  acc: WorkerAcc,
  category: ComplianceCategory
): GroupedComplianceItem {
  const lines = dedupeSortedLines(acc.lines);
  const primary = lines[0];
  const rest = lines.slice(1);
  const worstSeverity: ComplianceTrafficSeverity =
    lines.some((l) => l.severity === "critical") ? "critical" : "warning";
  return {
    workerId,
    workerName: acc.name,
    category,
    lines,
    worstSeverity,
    headlineTr: primary?.tr ?? "",
    headlineEn: primary?.en ?? "",
    extraCount: rest.length,
    extraLinesTr: rest.map((l) => l.tr),
    extraLinesEn: rest.map((l) => l.en),
  };
}

function mapToGroupedItems(
  map: Map<string, WorkerAcc>,
  category: ComplianceCategory
): GroupedComplianceItem[] {
  return Array.from(map.entries())
    .map(([workerId, v]) => toGroupedPerson(workerId, v, category))
    .sort((a, b) => {
      if (a.worstSeverity !== b.worstSeverity) {
        return a.worstSeverity === "critical" ? -1 : 1;
      }
      return a.workerName.localeCompare(b.workerName);
    });
}

function summarizeCategory(
  map: Map<string, WorkerAcc>,
  category: ComplianceCategory
): TrafficLightCardData {
  const items = mapToGroupedItems(map, category);
  const criticalCount = items.filter((i) => i.worstSeverity === "critical").length;
  const warningCount = items.filter((i) => i.worstSeverity === "warning").length;
  const trafficLight: TrafficLightState =
    criticalCount > 0 ? "red" : warningCount > 0 ? "amber" : "green";
  const score: TrafficLightScore =
    trafficLight === "red" ? 2 : trafficLight === "amber" ? 1 : 0;
  return {
    id: category,
    trafficLight,
    score,
    criticalCount,
    warningCount,
    detailHref: DETAIL_HREF[category],
    items,
  };
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

/** Kısa vize bildirimi metinleri */
function visaNotificationLines(
  type: NotificationType,
  sev: ComplianceTrafficSeverity
): ComplianceIssueLine {
  const suffixTr = sev === "critical" ? " — gecikmiş / acil" : "";
  const suffixEn = sev === "critical" ? " — overdue / urgent" : "";
  switch (type) {
    case "VISA_EXPIRING_7_DAYS":
      return {
        key: `notif:${type}`,
        severity: sev,
        tr: `Vize bildirimi: 7 gün içinde sona erecek${suffixTr}`,
        en: `Visa notification: expires within 7 days${suffixEn}`,
      };
    case "VISA_EXPIRING_30_DAYS":
      return {
        key: `notif:${type}`,
        severity: sev,
        tr: `Vize bildirimi: 30 gün içinde sona erecek${suffixTr}`,
        en: `Visa notification: expires within 30 days${suffixEn}`,
      };
    case "VISA_EXPIRING_60_DAYS":
      return {
        key: `notif:${type}`,
        severity: sev,
        tr: `Vize bildirimi: 60 gün içinde sona erecek${suffixTr}`,
        en: `Visa notification: expires within 60 days${suffixEn}`,
      };
    case "VISA_EXPIRING_90_DAYS":
      return {
        key: `notif:${type}`,
        severity: sev,
        tr: `Vize bildirimi: 90 gün içinde sona erecek${suffixTr}`,
        en: `Visa notification: expires within 90 days${suffixEn}`,
      };
    default:
      return {
        key: `notif:${type}`,
        severity: sev,
        tr: `Vize bildirimi (${type.replace(/_/g, " ").toLowerCase()})${suffixTr}`,
        en: `Visa notification (${type.replace(/_/g, " ").toLowerCase()})${suffixEn}`,
      };
  }
}

function sponsorshipNotificationLine(
  type: NotificationType,
  sev: ComplianceTrafficSeverity
): ComplianceIssueLine {
  const map: Partial<
    Record<NotificationType, { tr: string; en: string; key: string }>
  > = {
    SPONSORSHIP_ENDED: {
      key: `notif:${type}`,
      tr: "Sponsorluk bildirimi: süre doldu",
      en: "Sponsorship notification: ended",
    },
    SPONSORSHIP_ENDING_7_DAYS: {
      key: `notif:${type}`,
      tr: "Sponsorluk bildirimi: 7 gün içinde sona erecek",
      en: "Sponsorship notification: ends within 7 days",
    },
    SPONSORSHIP_ENDING_30_DAYS: {
      key: `notif:${type}`,
      tr: "Sponsorluk bildirimi: 30 gün içinde sona erecek",
      en: "Sponsorship notification: ends within 30 days",
    },
    SPONSORSHIP_ENDING_60_DAYS: {
      key: `notif:${type}`,
      tr: "Sponsorluk bildirimi: 60 gün içinde sona erecek",
      en: "Sponsorship notification: ends within 60 days",
    },
  };
  const base = map[type];
  if (base) return { ...base, severity: sev };
  return {
    key: `notif:${type}`,
    severity: sev,
    tr: `Sponsorluk bildirimi (${type.replace(/_/g, " ")})`,
    en: `Sponsorship notification (${type.replace(/_/g, " ")})`,
  };
}

function rtwNotificationLine(
  type: NotificationType,
  sev: ComplianceTrafficSeverity
): ComplianceIssueLine {
  const map: Partial<
    Record<NotificationType, { tr: string; en: string; key: string }>
  > = {
    RIGHT_TO_WORK_RECHECK_7_DAYS: {
      key: `notif:${type}`,
      tr: "Çalışma hakkı bildirimi: 7 gün içinde kontrol",
      en: "Right to Work notification: check due within 7 days",
    },
    RIGHT_TO_WORK_RECHECK_30_DAYS: {
      key: `notif:${type}`,
      tr: "Çalışma hakkı bildirimi: 30 gün içinde kontrol",
      en: "Right to Work notification: check due within 30 days",
    },
    RIGHT_TO_WORK_RECHECK_60_DAYS: {
      key: `notif:${type}`,
      tr: "Çalışma hakkı bildirimi: 60 gün içinde kontrol",
      en: "Right to Work notification: check due within 60 days",
    },
  };
  const base = map[type];
  if (base) return { ...base, severity: sev };
  return {
    key: `notif:${type}`,
    severity: sev,
    tr: `Çalışma hakkı bildirimi (${type.replace(/_/g, " ")})`,
    en: `Right to Work notification (${type.replace(/_/g, " ")})`,
  };
}

function docNotificationLine(
  type: NotificationType,
  sev: ComplianceTrafficSeverity
): ComplianceIssueLine {
  if (type === "WORKER_MISSING_DOCUMENTS") {
    return {
      key: `notif:${type}`,
      severity: sev,
      tr: "Belge bildirimi: eksik belge",
      en: "Document notification: missing document",
    };
  }
  return {
    key: `notif:${type}`,
    severity: sev,
    tr: "Belge bildirimi: süresi yaklaşan belge",
    en: "Document notification: expiring document",
  };
}

function lineFromVisaExpiryDays(days: number): ComplianceIssueLine | null {
  if (days < 0) {
    return {
      key: "visa:field:expired",
      severity: "critical",
      tr: "Vize süresi doldu",
      en: "Visa has expired",
    };
  }
  if (days === 0) {
    return {
      key: "visa:field:0",
      severity: "critical",
      tr: "Vize bugün sona eriyor",
      en: "Visa expires today",
    };
  }
  if (days === 1) {
    return {
      key: "visa:field:1",
      severity: "critical",
      tr: "Vize 1 gün içinde sona erecek",
      en: "Visa expires within 1 day",
    };
  }
  if (days <= 7) {
    return {
      key: `visa:field:${days}`,
      severity: "critical",
      tr: `Vize ${days} gün içinde sona erecek`,
      en: `Visa expires within ${days} days`,
    };
  }
  if (days <= 90) {
    return {
      key: `visa:field:${days}`,
      severity: "warning",
      tr: `Vize ${days} gün içinde sona erecek`,
      en: `Visa expires within ${days} days`,
    };
  }
  return null;
}

function lineFromCosDays(days: number): ComplianceIssueLine | null {
  if (days < 0) {
    return {
      key: "cos:expired",
      severity: "critical",
      tr: "CoS süresi doldu",
      en: "Certificate of Sponsorship has expired",
    };
  }
  if (days === 0) {
    return {
      key: "cos:0",
      severity: "critical",
      tr: "CoS bugün sona eriyor",
      en: "CoS expires today",
    };
  }
  if (days === 1) {
    return {
      key: "cos:1",
      severity: "critical",
      tr: "CoS 1 gün içinde sona erecek",
      en: "CoS expires within 1 day",
    };
  }
  if (days <= 7) {
    return {
      key: `cos:${days}`,
      severity: "critical",
      tr: `CoS ${days} gün içinde sona erecek`,
      en: `CoS expires within ${days} days`,
    };
  }
  if (days <= 90) {
    return {
      key: `cos:${days}`,
      severity: "warning",
      tr: `CoS ${days} gün içinde sona erecek`,
      en: `CoS expires within ${days} days`,
    };
  }
  return null;
}

function lineFromSponsorEndDays(sd: number): ComplianceIssueLine | null {
  if (sd < 0) {
    return {
      key: "sp:end:passed",
      severity: "critical",
      tr: "Sponsorluk bitiş tarihi geçmiş",
      en: "Sponsorship end date has passed",
    };
  }
  if (sd === 0) {
    return {
      key: "sp:end:0",
      severity: "critical",
      tr: "Sponsorluk bugün sona eriyor",
      en: "Sponsorship ends today",
    };
  }
  if (sd === 1) {
    return {
      key: "sp:end:1",
      severity: "critical",
      tr: "Sponsorluk 1 gün içinde sona erecek",
      en: "Sponsorship ends within 1 day",
    };
  }
  if (sd <= 7) {
    return {
      key: `sp:end:${sd}`,
      severity: "critical",
      tr: `Sponsorluk ${sd} gün içinde sona erecek`,
      en: `Sponsorship ends within ${sd} days`,
    };
  }
  if (sd <= 60) {
    return {
      key: `sp:end:${sd}`,
      severity: "warning",
      tr: `Sponsorluk ${sd} gün içinde sona erecek`,
      en: `Sponsorship ends within ${sd} days`,
    };
  }
  return null;
}

function lineFromRtwDays(rtwD: number): ComplianceIssueLine | null {
  if (rtwD < 0) {
    return {
      key: "rtw:overdue",
      severity: "critical",
      tr: "Çalışma hakkı kontrolü gecikmiş",
      en: "Right to Work check is overdue",
    };
  }
  if (rtwD === 0) {
    return {
      key: "rtw:0",
      severity: "critical",
      tr: "Çalışma hakkı kontrolü bugün",
      en: "Right to Work check due today",
    };
  }
  if (rtwD === 1) {
    return {
      key: "rtw:1",
      severity: "critical",
      tr: "Çalışma hakkı kontrolü 1 gün içinde",
      en: "Right to Work check due within 1 day",
    };
  }
  if (rtwD <= 7) {
    return {
      key: `rtw:${rtwD}`,
      severity: "critical",
      tr: `Çalışma hakkı kontrolü ${rtwD} gün içinde`,
      en: `Right to Work check due within ${rtwD} days`,
    };
  }
  if (rtwD <= 60) {
    return {
      key: `rtw:${rtwD}`,
      severity: "warning",
      tr: `Çalışma hakkı kontrolü ${rtwD} gün içinde`,
      en: `Right to Work check due within ${rtwD} days`,
    };
  }
  return null;
}

/** Tüm kategorilerde tek çalışan satırı */
export function buildAggregateRows(categories: TrafficLightCardData[]): ComplianceAggregateRow[] {
  type Tagged = ComplianceIssueLine & { category: ComplianceCategory };

  const byWorker = new Map<
    string,
    { name: string; tagged: Tagged[]; badgeSet: Set<ComplianceCategory> }
  >();

  for (const cat of categories) {
    for (const item of cat.items) {
      let bucket = byWorker.get(item.workerId);
      if (!bucket) {
        bucket = { name: item.workerName, tagged: [], badgeSet: new Set() };
        byWorker.set(item.workerId, bucket);
      }
      bucket.badgeSet.add(cat.id);
      for (const line of item.lines) {
        bucket.tagged.push({
          ...line,
          key: `${cat.id}:${line.key}`,
          category: cat.id,
        });
      }
    }
  }

  const rows: ComplianceAggregateRow[] = [];
  for (const [workerId, v] of Array.from(byWorker.entries())) {
    const seen = new Set<string>();
    const uniq: Tagged[] = [];
    for (const t of v.tagged) {
      if (seen.has(t.key)) continue;
      seen.add(t.key);
      uniq.push(t);
    }
    uniq.sort((a, b) => {
      const ra = severityRank(a.severity);
      const rb = severityRank(b.severity);
      if (ra !== rb) return ra - rb;
      return a.tr.localeCompare(b.tr);
    });
    const primary = uniq[0];
    const rest = uniq.slice(1);
    if (!primary) continue;
    rows.push({
      workerId,
      workerName: v.name,
      severity: primary.severity,
      headlineTr: primary.tr,
      headlineEn: primary.en,
      categoryBadges: sortCategoriesForUi(Array.from(v.badgeSet.values())),
      extraCount: rest.length,
      extraLines: rest.map((r) => ({
        tr: r.tr,
        en: r.en,
        category: r.category,
      })),
    });
  }

  return rows.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === "critical" ? -1 : 1;
    return a.workerName.localeCompare(b.workerName);
  });
}

export function scoreToOverallLight(categories: TrafficLightCardData[]): {
  overallTrafficLight: TrafficLightState;
  overallScore: TrafficLightScore;
} {
  let overallScore: TrafficLightScore = 0;
  for (const c of categories) {
    overallScore = Math.max(overallScore, c.score) as TrafficLightScore;
  }
  const overallTrafficLight: TrafficLightState =
    overallScore === 2 ? "red" : overallScore === 1 ? "amber" : "green";
  return { overallTrafficLight, overallScore };
}

/**
 * Kart skorları ve kişi gruplanmış liste.
 * withTenant bağlamında `db` olarak tenant Prisma kullanılmalıdır.
 */
export async function computeTrafficDashboard(
  db: PrismaTenantClient,
  now: Date = new Date()
): Promise<DashboardSummary> {
  const visaMap = new Map<string, WorkerAcc>();
  const sponsorMap = new Map<string, WorkerAcc>();
  const rtwMap = new Map<string, WorkerAcc>();
  const docMap = new Map<string, WorkerAcc>();

  const [workers, notifs] = await Promise.all([
    db.worker.findMany({
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
    }),
    db.notificationEvent.findMany({
      where: { status: { in: ["PENDING", "OVERDUE"] } },
      select: {
        workerId: true,
        eventType: true,
        status: true,
      },
    }),
  ]);

  const nameOf = (w: (typeof workers)[number]) =>
    `${w.firstName} ${w.lastName}`.trim();

  for (const w of workers) {
    const nm = nameOf(w);

    if (w.visaExpiryDate) {
      const days = daysBetween(startOfDay(now), startOfDay(w.visaExpiryDate));
      const line = lineFromVisaExpiryDays(days);
      if (line) upsertLine(visaMap, w.id, nm, line);
    }

    const cosDays = daysBetween(startOfDay(now), startOfDay(w.cosExpiryDate));
    const cosLine = lineFromCosDays(cosDays);
    if (cosLine) upsertLine(sponsorMap, w.id, nm, cosLine);

    if (w.sponsorshipEndDate) {
      const sd = daysBetween(startOfDay(now), startOfDay(w.sponsorshipEndDate));
      const spLine = lineFromSponsorEndDays(sd);
      if (spLine) upsertLine(sponsorMap, w.id, nm, spLine);
    }

    const nextRtw = w.rtwChecks[0]?.nextCheckDueAt;
    if (nextRtw) {
      const rtwD = daysBetween(startOfDay(now), startOfDay(nextRtw));
      const rtwLine = lineFromRtwDays(rtwD);
      if (rtwLine) upsertLine(rtwMap, w.id, nm, rtwLine);
    }

    if (!nextRtw && !w.rightToWorkLastCheckedAt && w.employmentStatus === "ACTIVE") {
      upsertLine(rtwMap, w.id, nm, {
        key: "rtw:none",
        severity: "warning",
        tr: "Kayıtlı çalışma hakkı kontrolü yok",
        en: "No Right to Work check on file",
      });
    }

    const missing = evaluateMissingDocuments(w, w.documents, now);
    for (const m of missing) {
      const sev: ComplianceTrafficSeverity =
        m.urgency === "HIGH" ? "critical" : "warning";
      upsertLine(docMap, w.id, nm, {
        key: `miss:${m.label}`,
        severity: sev,
        tr: `Eksik belge: ${m.label}`,
        en: `Missing document: ${m.label}`,
      });
    }

    for (const d of w.documents) {
      if (!d.expiryDate) continue;
      const ed = daysBetween(startOfDay(now), startOfDay(d.expiryDate));
      if (ed < 0) {
        upsertLine(docMap, w.id, nm, {
          key: `exp:${d.id}`,
          severity: "critical",
          tr: `Belge süresi doldu: ${d.fileName}`,
          en: `Document expired: ${d.fileName}`,
        });
      } else if (ed <= 30) {
        upsertLine(docMap, w.id, nm, {
          key: `expsoon:${d.id}`,
          severity: "warning",
          tr:
            ed === 1
              ? `Belge 1 gün içinde sona erecek: ${d.fileName}`
              : `Belge ${ed} gün içinde sona erecek: ${d.fileName}`,
          en:
            ed === 1
              ? `Document expires within 1 day: ${d.fileName}`
              : `Document expires within ${ed} days: ${d.fileName}`,
        });
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
      if (sev) upsertLine(visaMap, w.id, nm, visaNotificationLines(t, sev));
    } else if (SPONSORSHIP_NOTIF.has(t)) {
      const sev = notifSeverity(n.status, t, false, false, true, false);
      if (sev)
        upsertLine(sponsorMap, w.id, nm, sponsorshipNotificationLine(t, sev));
    } else if (RTW_NOTIF.has(t)) {
      const sev = notifSeverity(n.status, t, false, true, false, false);
      if (sev) upsertLine(rtwMap, w.id, nm, rtwNotificationLine(t, sev));
    } else if (DOC_NOTIF.has(t)) {
      const sev = notifSeverity(n.status, t, false, false, false, true);
      if (sev) upsertLine(docMap, w.id, nm, docNotificationLine(t, sev));
    }
  }

  const categories: TrafficLightCardData[] = [
    summarizeCategory(visaMap, "visa"),
    summarizeCategory(sponsorMap, "sponsorship"),
    summarizeCategory(rtwMap, "rightToWork"),
    summarizeCategory(docMap, "documents"),
  ];

  const { overallTrafficLight, overallScore } = scoreToOverallLight(categories);
  const aggregateItems = buildAggregateRows(categories);

  return {
    generatedAt: now.toISOString(),
    overallTrafficLight,
    overallScore,
    categories,
    aggregateItems,
  };
}
