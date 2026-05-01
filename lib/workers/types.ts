import type { EmploymentStatus } from "@prisma/client";
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
