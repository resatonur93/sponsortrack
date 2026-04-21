import type { Prisma } from "@prisma/client";
import {
  AbsenceStatus,
  AbsenceType,
  AlertType,
  ComplianceRiskLevel,
  DocumentFolder,
  DocumentType,
  EmploymentStatus,
  EventStatus,
  EventType,
  NotificationStatus,
  NotificationType,
  OrgChangeStatus,
  OrgChangeType,
  RiskLevel,
} from "@prisma/client";
import { computeExpectedForPeriod } from "@/lib/salary-record-utils";

const RTW_MAX_AGE_DAYS = 182;
const REVIEW_MAX_AGE_DAYS = 35;

export type RiskFactorJson = {
  factor: string;
  points: number;
  description: string;
};

export type WorkerRiskDbShape = {
  id: string;
  employmentStatus: EmploymentStatus;
  visaExpiryDate: Date | null;
  rightToWorkLastCheckedAt: Date | null;
  documents: {
    documentType: DocumentType;
    isDeleted: boolean;
    expiryDate: Date | null;
  }[];
  documentVaults: {
    folder: DocumentFolder;
    isDeleted: boolean;
  }[];
  notifications: {
    eventType: NotificationType;
    status: NotificationStatus;
    dueDate: Date;
    reportDeadlineAt: Date | null;
  }[];
  complianceEvents: {
    eventType: EventType;
    status: EventStatus;
    reportDeadline: Date;
  }[];
  alerts: {
    alertType: AlertType;
    dismissedAt: Date | null;
  }[];
  absences: {
    type: AbsenceType;
    status: AbsenceStatus;
  }[];
  roleCompliance: {
    needsChangeOfEmployment: boolean;
    mismatchFlags: string[];
    lastReviewed: Date | null;
  } | null;
  salaryRecords: {
    isCompliant: boolean;
    contractedSalary: number;
    actualPaid: number;
    periodStart: Date;
    periodEnd: Date;
  }[];
};

export type OrgChangeDbShape = {
  id: string;
  changeType: OrgChangeType;
  status: OrgChangeStatus;
  reportedToHO: boolean;
};

export function scoreToRiskLevel(score: number): RiskLevel {
  if (score <= 20) return RiskLevel.LOW;
  if (score <= 50) return RiskLevel.MEDIUM;
  if (score <= 80) return RiskLevel.HIGH;
  return RiskLevel.CRITICAL;
}

export function riskLevelToComplianceLevel(
  level: RiskLevel
): ComplianceRiskLevel {
  return level as unknown as ComplianceRiskLevel;
}

function hasValidRtwDocument(
  docs: WorkerRiskDbShape["documents"],
  now: Date
): boolean {
  return docs.some(
    (d) =>
      !d.isDeleted &&
      d.documentType === DocumentType.RIGHT_TO_WORK &&
      (!d.expiryDate || d.expiryDate >= now)
  );
}

function hasExpiredImmigrationDoc(
  docs: WorkerRiskDbShape["documents"],
  now: Date
): boolean {
  const types: DocumentType[] = [
    DocumentType.PASSPORT,
    DocumentType.BRP,
    DocumentType.VISA,
    DocumentType.EVISA,
  ];
  return docs.some(
    (d) =>
      !d.isDeleted &&
      types.includes(d.documentType) &&
      d.expiryDate != null &&
      d.expiryDate < now
  );
}

export function computeWorkerOnlyFactors(
  w: WorkerRiskDbShape,
  now: Date
): RiskFactorJson[] {
  const factors: RiskFactorJson[] = [];

  if (w.employmentStatus === EmploymentStatus.ACTIVE) {
    const rtwStale =
      !w.rightToWorkLastCheckedAt ||
      (now.getTime() - w.rightToWorkLastCheckedAt.getTime()) /
        86400000 >
        RTW_MAX_AGE_DAYS;
    if (rtwStale && !hasValidRtwDocument(w.documents, now)) {
      factors.push({
        factor: "MISSING_RTW_EVIDENCE",
        points: 20,
        description:
          "No recent RTW check and no valid RIGHT_TO_WORK document on file",
      });
    }
  }

  if (
    (w.visaExpiryDate && w.visaExpiryDate < now) ||
    hasExpiredImmigrationDoc(w.documents, now)
  ) {
    factors.push({
      factor: "EXPIRED_PASSPORT_VISA",
      points: 30,
      description: "Visa expiry passed or passport/BRP/eVisa document expired",
    });
  }

  const latestSalary = [...w.salaryRecords].sort(
    (a, b) => b.periodEnd.getTime() - a.periodEnd.getTime()
  )[0];
  if (latestSalary && !latestSalary.isCompliant) {
    const expected = computeExpectedForPeriod(
      latestSalary.contractedSalary,
      latestSalary.periodStart,
      latestSalary.periodEnd
    );
    if (expected > 0) {
      const gap = (expected - latestSalary.actualPaid) / expected;
      if (gap > 0.1) {
        factors.push({
          factor: "SALARY_MISMATCH_GT_10PCT",
          points: 25,
          description: `Latest salary period underpaid vs pro-rated expectation by ${Math.round(gap * 100)}%`,
        });
      }
    }
  }

  const locOpen =
    w.notifications.some(
      (n) =>
        n.eventType === NotificationType.WORK_LOCATION_CHANGE &&
        (n.status === NotificationStatus.PENDING ||
          n.status === NotificationStatus.OVERDUE)
    ) ||
    w.complianceEvents.some(
      (e) =>
        e.eventType === EventType.WORK_LOCATION_CHANGE &&
        e.status !== EventStatus.REPORTED &&
        e.status !== EventStatus.CANCELLED
    );
  if (locOpen) {
    factors.push({
      factor: "WORK_LOCATION_MISMATCH",
      points: 20,
      description: "Open work location change notification or compliance event",
    });
  }

  const unexplained =
    w.alerts.some(
      (a) =>
        a.alertType === AlertType.UNEXPLAINED_ABSENCE && !a.dismissedAt
    ) ||
    w.absences.some(
      (a) =>
        a.type === AbsenceType.UNAUTHORISED &&
        a.status === AbsenceStatus.ACTIVE
    );
  if (unexplained) {
    factors.push({
      factor: "UNEXPLAINED_ABSENCE",
      points: 15,
      description: "Unexplained absence alert or active unauthorised absence",
    });
  }

  const pendingReport =
    w.notifications.some((n) => n.status === NotificationStatus.PENDING) ||
    w.complianceEvents.some(
      (e) =>
        e.status === EventStatus.PENDING ||
        e.status === EventStatus.UNDER_REVIEW
    );
  if (pendingReport) {
    factors.push({
      factor: "PENDING_REPORT_DEADLINE",
      points: 10,
      description: "Pending notification or compliance case not closed",
    });
  }

  const rc = w.roleCompliance;
  if (rc && (rc.needsChangeOfEmployment || rc.mismatchFlags.length > 0)) {
    factors.push({
      factor: "JOB_DUTIES_DRIFT",
      points: 20,
      description: "Role compliance flags or change of employment indicated",
    });
  }

  if (
    w.employmentStatus === EmploymentStatus.ACTIVE &&
    rc &&
    (!rc.lastReviewed ||
      now.getTime() - rc.lastReviewed.getTime() >
        REVIEW_MAX_AGE_DAYS * 86400000)
  ) {
    factors.push({
      factor: "MISSING_MONTHLY_REVIEW",
      points: 5,
      description: "No role compliance review in the last 35 days",
    });
  }

  return factors;
}

export function computeOrganisationFactors(
  orgChanges: OrgChangeDbShape[],
  workers: WorkerRiskDbShape[],
  _now: Date
): RiskFactorJson[] {
  const factors: RiskFactorJson[] = [];

  const openOrgStatuses: OrgChangeStatus[] = [
    OrgChangeStatus.PENDING,
    OrgChangeStatus.IN_PROGRESS,
    OrgChangeStatus.OVERDUE,
  ];
  const openOrg = orgChanges.filter((o) => openOrgStatuses.includes(o.status));
  if (openOrg.length > 0) {
    factors.push({
      factor: "PENDING_ORG_CHANGE",
      points: 15,
      description: `${openOrg.length} open organisation change record(s)`,
    });
  }

  const activeWorkers = workers.filter(
    (w) => w.employmentStatus === EmploymentStatus.ACTIVE
  );
  const missingPack = activeWorkers.filter(
    (w) =>
      !w.documentVaults.some(
        (v) =>
          !v.isDeleted && v.folder === DocumentFolder.COMPLIANCE_VISIT_PACK
      )
  );
  if (missingPack.length > 0) {
    factors.push({
      factor: "MISSING_COMPLIANCE_VISIT_PACK",
      points: 20,
      description: `${missingPack.length} active worker(s) without compliance visit pack in vault`,
    });
  }

  const keyPersonnel = orgChanges.filter(
    (o) =>
      o.changeType === OrgChangeType.KEY_PERSONNEL_CHANGE &&
      !o.reportedToHO &&
      o.status !== OrgChangeStatus.REPORTED
  );
  if (keyPersonnel.length > 0) {
    factors.push({
      factor: "KEY_PERSONNEL_NOT_REPORTED",
      points: 25,
      description: `${keyPersonnel.length} key personnel change(s) not reported to HO`,
    });
  }

  return factors;
}

export function mergeFactors(
  workerFactors: RiskFactorJson[],
  orgFactors: RiskFactorJson[]
): { factors: RiskFactorJson[]; score: number; level: RiskLevel } {
  const factors = [...workerFactors, ...orgFactors];
  const score = factors.reduce((s, f) => s + f.points, 0);
  return { factors, score, level: scoreToRiskLevel(score) };
}

export function factorsToPrismaJson(
  factors: RiskFactorJson[]
): Prisma.InputJsonValue {
  return factors as unknown as Prisma.InputJsonValue;
}
