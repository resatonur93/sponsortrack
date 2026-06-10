import { describe, it, expect } from "vitest";
import {
  scoreToRiskLevel,
  computeWorkerOnlyFactors,
  computeOrganisationFactors,
  mergeFactors,
  type WorkerRiskDbShape,
  type OrgChangeDbShape,
} from "@/lib/risk-scoring-engine";

function makeWorker(overrides: Partial<WorkerRiskDbShape> = {}): WorkerRiskDbShape {
  return {
    id: "w1",
    employmentStatus: "ACTIVE",
    visaExpiryDate: null,
    rightToWorkLastCheckedAt: new Date(),
    documents: [],
    documentVaults: [],
    notifications: [],
    complianceEvents: [],
    alerts: [],
    absences: [],
    roleCompliance: null,
    salaryRecords: [],
    ...overrides,
  };
}

describe("scoreToRiskLevel", () => {
  it("0–20 → LOW", () => {
    expect(scoreToRiskLevel(0)).toBe("LOW");
    expect(scoreToRiskLevel(20)).toBe("LOW");
  });

  it("21–50 → MEDIUM", () => {
    expect(scoreToRiskLevel(21)).toBe("MEDIUM");
    expect(scoreToRiskLevel(50)).toBe("MEDIUM");
  });

  it("51–80 → HIGH", () => {
    expect(scoreToRiskLevel(51)).toBe("HIGH");
    expect(scoreToRiskLevel(80)).toBe("HIGH");
  });

  it("81+ → CRITICAL", () => {
    expect(scoreToRiskLevel(81)).toBe("CRITICAL");
    expect(scoreToRiskLevel(200)).toBe("CRITICAL");
  });
});

describe("computeWorkerOnlyFactors", () => {
  const now = new Date("2024-06-15T00:00:00Z");

  it("temiz worker için factor yok", () => {
    const worker = makeWorker({
      rightToWorkLastCheckedAt: new Date("2024-05-01T00:00:00Z"),
      documents: [
        {
          documentType: "RIGHT_TO_WORK",
          isDeleted: false,
          expiryDate: new Date("2025-12-31T00:00:00Z"),
        },
      ],
    });
    const factors = computeWorkerOnlyFactors(worker, now);
    expect(factors).toHaveLength(0);
  });

  it("süresi geçmiş vize için EXPIRED_PASSPORT_VISA faktörü ekler", () => {
    const worker = makeWorker({
      visaExpiryDate: new Date("2024-01-01T00:00:00Z"), // geçmiş
    });
    const factors = computeWorkerOnlyFactors(worker, now);
    expect(factors.some((f) => f.factor === "EXPIRED_PASSPORT_VISA")).toBe(true);
  });

  it("RTW belgesi yokken ve son kontrol çok eskiyse MISSING_RTW_EVIDENCE ekler", () => {
    const staleDate = new Date("2023-01-01T00:00:00Z"); // 180+ gün önce
    const worker = makeWorker({
      rightToWorkLastCheckedAt: staleDate,
      documents: [], // RTW belgesi yok
    });
    const factors = computeWorkerOnlyFactors(worker, now);
    expect(factors.some((f) => f.factor === "MISSING_RTW_EVIDENCE")).toBe(true);
  });

  it("geçerli RTW belgesi varsa MISSING_RTW_EVIDENCE eklenmez", () => {
    const staleDate = new Date("2023-01-01T00:00:00Z");
    const worker = makeWorker({
      rightToWorkLastCheckedAt: staleDate,
      documents: [
        {
          documentType: "RIGHT_TO_WORK",
          isDeleted: false,
          expiryDate: new Date("2025-12-31T00:00:00Z"),
        },
      ],
    });
    const factors = computeWorkerOnlyFactors(worker, now);
    expect(factors.some((f) => f.factor === "MISSING_RTW_EVIDENCE")).toBe(false);
  });

  it("aktif unauthorized absence için UNEXPLAINED_ABSENCE ekler", () => {
    const worker = makeWorker({
      absences: [{ type: "UNAUTHORISED", status: "ACTIVE" }],
    });
    const factors = computeWorkerOnlyFactors(worker, now);
    expect(factors.some((f) => f.factor === "UNEXPLAINED_ABSENCE")).toBe(true);
  });

  it("role compliance mismatch için JOB_DUTIES_DRIFT ekler", () => {
    const worker = makeWorker({
      roleCompliance: {
        needsChangeOfEmployment: true,
        mismatchFlags: ["duty_mismatch"],
        lastReviewed: now,
      },
    });
    const factors = computeWorkerOnlyFactors(worker, now);
    expect(factors.some((f) => f.factor === "JOB_DUTIES_DRIFT")).toBe(true);
  });

  it("maaş uyumsuzluğu >%10 ise SALARY_MISMATCH_GT_10PCT ekler", () => {
    const periodStart = new Date("2024-01-01T00:00:00Z");
    const periodEnd = new Date("2024-03-31T00:00:00Z");
    const worker = makeWorker({
      salaryRecords: [
        {
          isCompliant: false,
          contractedSalary: 36000,
          actualPaid: 1000, // çok düşük
          periodStart,
          periodEnd,
        },
      ],
    });
    const factors = computeWorkerOnlyFactors(worker, now);
    expect(factors.some((f) => f.factor === "SALARY_MISMATCH_GT_10PCT")).toBe(true);
  });

  it("TERMINATED worker için RTW kontrolü yapılmaz", () => {
    const staleDate = new Date("2023-01-01T00:00:00Z");
    const worker = makeWorker({
      employmentStatus: "TERMINATED",
      rightToWorkLastCheckedAt: staleDate,
      documents: [],
    });
    const factors = computeWorkerOnlyFactors(worker, now);
    expect(factors.some((f) => f.factor === "MISSING_RTW_EVIDENCE")).toBe(false);
  });
});

describe("computeOrganisationFactors", () => {
  const now = new Date("2024-06-15T00:00:00Z");

  it("açık org change için PENDING_ORG_CHANGE ekler", () => {
    const orgChanges: OrgChangeDbShape[] = [
      { id: "oc1", changeType: "MERGER", status: "PENDING", reportedToHO: false },
    ];
    const factors = computeOrganisationFactors(orgChanges, [], now);
    expect(factors.some((f) => f.factor === "PENDING_ORG_CHANGE")).toBe(true);
  });

  it("compliance visit pack eksik active worker için MISSING_COMPLIANCE_VISIT_PACK ekler", () => {
    const worker = makeWorker({ documentVaults: [] });
    const factors = computeOrganisationFactors([], [worker], now);
    expect(factors.some((f) => f.factor === "MISSING_COMPLIANCE_VISIT_PACK")).toBe(true);
  });

  it("compliance visit pack olan worker için eklenmez", () => {
    const worker = makeWorker({
      documentVaults: [{ folder: "COMPLIANCE_VISIT_PACK", isDeleted: false }],
    });
    const factors = computeOrganisationFactors([], [worker], now);
    expect(factors.some((f) => f.factor === "MISSING_COMPLIANCE_VISIT_PACK")).toBe(false);
  });

  it("HO'ya bildirilmemiş KEY_PERSONNEL_CHANGE için KEY_PERSONNEL_NOT_REPORTED ekler", () => {
    const orgChanges: OrgChangeDbShape[] = [
      {
        id: "oc1",
        changeType: "KEY_PERSONNEL_CHANGE",
        status: "PENDING",
        reportedToHO: false,
      },
    ];
    const factors = computeOrganisationFactors(orgChanges, [], now);
    expect(factors.some((f) => f.factor === "KEY_PERSONNEL_NOT_REPORTED")).toBe(true);
  });
});

describe("mergeFactors", () => {
  it("worker ve org faktörlerini birleştirir ve toplam skoru hesaplar", () => {
    const wf = [{ factor: "EXPIRED_PASSPORT_VISA", points: 30, description: "" }];
    const of_ = [{ factor: "PENDING_ORG_CHANGE", points: 15, description: "" }];
    const result = mergeFactors(wf, of_);
    expect(result.factors).toHaveLength(2);
    expect(result.score).toBe(45);
    expect(result.level).toBe("MEDIUM");
  });

  it("boş faktörler için skor 0 ve level LOW", () => {
    const result = mergeFactors([], []);
    expect(result.score).toBe(0);
    expect(result.level).toBe("LOW");
  });

  it("yüksek puan CRITICAL döndürür", () => {
    const wf = [
      { factor: "A", points: 30, description: "" },
      { factor: "B", points: 30, description: "" },
      { factor: "C", points: 25, description: "" },
    ];
    const result = mergeFactors(wf, []);
    expect(result.score).toBe(85);
    expect(result.level).toBe("CRITICAL");
  });
});
