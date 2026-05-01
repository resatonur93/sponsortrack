import type {
  AbsenceRecord,
  ComplianceRiskLevel,
  Document,
  EmploymentStatus,
  NotificationEvent,
  RightToWorkCheck,
  RiskLevel,
  Worker,
  WorkerChangeLog,
} from "@prisma/client";
import type { VisaExpiryVisualState } from "@/lib/compliance/status-calculator";
import type { WorkerListDerivedStatus } from "./worker-status";

/** Çalışanlar sayfası filtre anahtarı */
export type WorkerListFilter =
  | "all"
  | "active"
  | "pending_onboarding"
  | "visa_expiring"
  | "visa_expired"
  | "suspended"
  | "terminated";

export type WorkerListFilters = {
  search?: string;
  listFilter?: WorkerListFilter;
};

export type WorkerListItem = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  cosReference: string;
  employmentStatus: EmploymentStatus;
  visaExpiryDate: string | null;
  derivedStatus: WorkerListDerivedStatus;
  visaUrgency: VisaExpiryVisualState;
};

/** Profil sayfası API yanıtı (`GET /api/workers/:id`) */
export type WorkerLineManagerBrief = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
} | null;

export type WorkerRoleComplianceReviewBrief = {
  lastReviewed: Date | null;
  reviewedBy: string | null;
} | null;

export type WorkerDetailPayload = Worker & {
  lineManager: WorkerLineManagerBrief;
  documents: Document[];
  notifications: NotificationEvent[];
  changeLogs: WorkerChangeLog[];
  absences: AbsenceRecord[];
  rtwChecks: RightToWorkCheck[];
  riskSnapshot: ComplianceRiskLevel;
  roleCompliance: WorkerRoleComplianceReviewBrief;
};

export type EngineRiskFactor = {
  factor: string;
  points: number;
  description: string;
};

export type EngineRiskSnapshot = {
  id: string;
  score: number;
  level: RiskLevel;
  calculatedAt: string;
  factors: unknown;
};

export type TenantUserOption = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};
