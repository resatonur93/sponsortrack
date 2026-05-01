/** Geriye dönük import yolları: yeni uyum paketine yönlendirir. */

export type {
  ComplianceAggregateRow,
  ComplianceCategory,
  ComplianceCategoryId as ComplianceTrafficCategoryId,
  ComplianceGroupedPersonItem,
  ComplianceIssueLine,
  ComplianceTrafficSeverity,
  ComplianceTrafficStatusPayload,
  DashboardSummary,
  GroupedComplianceItem,
  TrafficLightCard,
  TrafficLightCardData as ComplianceTrafficCategory,
  TrafficLightScore,
  TrafficLightState,
} from "./compliance/types";

export { computeTrafficDashboard as computeComplianceTrafficStatus } from "./compliance/traffic-light";
export { buildAggregateRows, scoreToOverallLight } from "./compliance/traffic-light";
