/** Uyum trafiği kartları ve dashboard özeti için ortak tipler */

export type ComplianceCategory =
  | "visa"
  | "sponsorship"
  | "rightToWork"
  | "documents";

/** @deprecated `ComplianceCategory` kullanın */
export type ComplianceCategoryId = ComplianceCategory;

export type TrafficLightState = "green" | "amber" | "red";

/** 0 = temiz, 1 = yalnız yaklaşan, 2 = kritik var */
export type TrafficLightScore = 0 | 1 | 2;

export type ComplianceTrafficSeverity = "critical" | "warning";

export type ComplianceIssueLine = {
  tr: string;
  en: string;
  severity: ComplianceTrafficSeverity;
  /** Aynı çalışan + kategori içinde tekrarları engellemek için */
  key: string;
};

/** Tek kategori içinde tek çalışan satırı (gruplanmış) */
export type GroupedComplianceItem = {
  workerId: string;
  workerName: string;
  category: ComplianceCategory;
  lines: ComplianceIssueLine[];
  worstSeverity: ComplianceTrafficSeverity;
  headlineTr: string;
  headlineEn: string;
  extraCount: number;
  extraLinesTr: string[];
  extraLinesEn: string[];
};

/** @deprecated `GroupedComplianceItem` kullanın */
export type ComplianceGroupedPersonItem = GroupedComplianceItem;

/** Tek kategori için trafik lambası kartı */
export type TrafficLightCardData = {
  id: ComplianceCategory;
  trafficLight: TrafficLightState;
  score: TrafficLightScore;
  criticalCount: number;
  warningCount: number;
  detailHref: string;
  items: GroupedComplianceItem[];
};

/** @deprecated `TrafficLightCardData` kullanın */
export type TrafficLightCard = TrafficLightCardData;

export type ComplianceAggregateRow = {
  workerId: string;
  workerName: string;
  severity: ComplianceTrafficSeverity;
  headlineTr: string;
  headlineEn: string;
  categoryBadges: ComplianceCategory[];
  extraCount: number;
  extraLines: Array<{
    tr: string;
    en: string;
    category: ComplianceCategory;
  }>;
};

export type DashboardSummary = {
  generatedAt: string;
  overallTrafficLight: TrafficLightState;
  overallScore: TrafficLightScore;
  categories: TrafficLightCardData[];
  aggregateItems: ComplianceAggregateRow[];
};

/** API ve geriye dönük uyumluluk */
export type ComplianceTrafficStatusPayload = DashboardSummary;
