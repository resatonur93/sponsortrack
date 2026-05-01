import type { EmploymentStatus } from "@prisma/client";
import { getVisaExpiryVisualState } from "@/lib/compliance/status-calculator";

/**
 * Liste / filtre için türetilmiş durum (Prisma `EmploymentStatus` ile karıştırılmamalı).
 */
export type WorkerListDerivedStatus =
  | "PENDING_ONBOARDING"
  | "ACTIVE"
  | "VISA_EXPIRING"
  | "EXPIRED"
  | "INACTIVE_SUSPENDED"
  | "INACTIVE_TERMINATED";

type DeriveInput = {
  employmentStatus: EmploymentStatus;
  visaExpiryDate: Date | null;
};

/**
 * Öncelik: sonlandırılmış → askıya → işe başlama bekliyor → vize (aktif çalışanlar) → aktif.
 */
export function deriveWorkerListStatus(
  w: DeriveInput,
  now: Date = new Date()
): WorkerListDerivedStatus {
  switch (w.employmentStatus) {
    case "TERMINATED":
      return "INACTIVE_TERMINATED";
    case "SUSPENDED":
      return "INACTIVE_SUSPENDED";
    case "PENDING_START":
      return "PENDING_ONBOARDING";
    case "ACTIVE": {
      const visa = getVisaExpiryVisualState(w.visaExpiryDate, now);
      if (visa === "expired") return "EXPIRED";
      if (visa === "expiring") return "VISA_EXPIRING";
      return "ACTIVE";
    }
    default:
      return "ACTIVE";
  }
}
