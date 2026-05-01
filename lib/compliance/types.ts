/** Uyum trafiği kartları ve dashboard özeti için ortak tipler */

export type ComplianceCategoryId =
  | "visa"
  | "sponsorship"
  | "rightToWork"
  | "documents";

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

/** Tek kategori içinde, tek çalışan satırı */
export type ComplianceGroupedPersonItem = {
  workerId: string;
  workerName: string;
  category: ComplianceCategoryId;
  lines: ComplianceIssueLine[];
  worstSeverity: ComplianceTrafficSeverity;
  headlineTr: string;
  headlineEn: string;
  extraCount: number;
  extraLinesTr: string[];
  extraLinesEn: string[];
};

export type TrafficLightCard = {
  id: ComplianceCategoryId;
  trafficLight: TrafficLightState;
  score: TrafficLightScore;
  criticalCount: number;
  warningCount: number;
  detailHref: string;
  items: ComplianceGroupedPersonItem[];
};

export type ComplianceAggregateRow = {
  workerId: string;
  workerName: string;
  severity: ComplianceTrafficSeverity;
  headlineTr: string;
  headlineEn: string;
  categoryBadges: ComplianceCategoryId[];
  extraCount: number;
  /** Accordion / genişletme için */
  extraLines: Array<{
    tr: string;
    en: string;
    category: ComplianceCategoryId;
  }>;
};

export type DashboardSummary = {
  generatedAt: string;
  overallTrafficLight: TrafficLightState;
  overallScore: TrafficLightScore;
  categories: TrafficLightCard[];
  aggregateItems: ComplianceAggregateRow[];
};

/** API ve geriye dönük uyumluluk */
export type ComplianceTrafficStatusPayload = DashboardSummary;
