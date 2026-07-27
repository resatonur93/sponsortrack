import { describe, it, expect } from "vitest";
import { detectAnomalies } from "@/lib/anomalies";
import type { SalaryRecord } from "@prisma/client";

function makeSalaryRecord(overrides: Partial<SalaryRecord> = {}): SalaryRecord {
  return {
    id: "sr1",
    workerId: "w1",
    periodStart: new Date("2024-01-01"),
    periodEnd: new Date("2024-01-31"),
    contractedSalary: 36000,
    actualPaid: 3000,
    currency: "GBP",
    hoursWorked: null,
    overtime: null,
    deductions: null,
    isCompliant: true,
    discrepancyReason: null,
    belowCosThreshold: false,
    hoursDiscrepancy: false,
    evidenceUrl: "https://example.com/payslip.pdf",
    approvedBy: null,
    tenantId: "t1",
    createdAt: new Date("2024-01-31"),
    ...overrides,
  } as SalaryRecord;
}

const baseInput = {
  workers: [],
  salaryHistory: [],
  changeLogs: [],
  documents: [],
  notifications: [],
};

describe("detectAnomalies — salaryRecords parametresi olmadan", () => {
  it("geriye dönük uyumlu: salaryRecords verilmezse yeni kodlar hiç üretilmez", () => {
    const findings = detectAnomalies(baseInput);
    expect(findings).toEqual([]);
  });
});

describe("detectAnomalies — MISSING_PAYSLIP_EVIDENCE", () => {
  it("evidenceUrl boşsa üretir", () => {
    const findings = detectAnomalies({
      ...baseInput,
      salaryRecords: [makeSalaryRecord({ evidenceUrl: null })],
    });
    expect(findings.some((f) => f.code === "MISSING_PAYSLIP_EVIDENCE")).toBe(true);
  });

  it("evidenceUrl doluysa üretmez", () => {
    const findings = detectAnomalies({
      ...baseInput,
      salaryRecords: [makeSalaryRecord({ evidenceUrl: "https://example.com/x.pdf" })],
    });
    expect(findings.some((f) => f.code === "MISSING_PAYSLIP_EVIDENCE")).toBe(false);
  });
});

describe("detectAnomalies — CONTRACTED_SALARY_BELOW_COS", () => {
  it("belowCosThreshold true ise üretir", () => {
    const findings = detectAnomalies({
      ...baseInput,
      salaryRecords: [makeSalaryRecord({ belowCosThreshold: true })],
    });
    expect(findings.some((f) => f.code === "CONTRACTED_SALARY_BELOW_COS")).toBe(true);
  });

  it("belowCosThreshold false ise üretmez", () => {
    const findings = detectAnomalies({
      ...baseInput,
      salaryRecords: [makeSalaryRecord({ belowCosThreshold: false })],
    });
    expect(findings.some((f) => f.code === "CONTRACTED_SALARY_BELOW_COS")).toBe(false);
  });
});

describe("detectAnomalies — DISALLOWED_SALARY_DEDUCTION", () => {
  it("izin verilmeyen kategoride kesinti varsa üretir", () => {
    const findings = detectAnomalies({
      ...baseInput,
      salaryRecords: [
        makeSalaryRecord({
          deductions: [{ label: "Konaklama", amount: 150, category: "ACCOMMODATION" }],
        }),
      ],
    });
    expect(findings.some((f) => f.code === "DISALLOWED_SALARY_DEDUCTION")).toBe(true);
  });

  it("sadece OTHER kategorisinde kesinti varsa üretmez", () => {
    const findings = detectAnomalies({
      ...baseInput,
      salaryRecords: [
        makeSalaryRecord({
          deductions: [{ label: "Diğer", amount: 20, category: "OTHER" }],
        }),
      ],
    });
    expect(findings.some((f) => f.code === "DISALLOWED_SALARY_DEDUCTION")).toBe(false);
  });

  it("kesinti yoksa üretmez", () => {
    const findings = detectAnomalies({
      ...baseInput,
      salaryRecords: [makeSalaryRecord({ deductions: null })],
    });
    expect(findings.some((f) => f.code === "DISALLOWED_SALARY_DEDUCTION")).toBe(false);
  });
});

describe("detectAnomalies — PAYSLIP_DROP_NO_JUSTIFICATION", () => {
  it("iki dönem arası %10+ düşüş ve gerekçe yoksa üretir", () => {
    const findings = detectAnomalies({
      ...baseInput,
      salaryRecords: [
        makeSalaryRecord({
          id: "sr1",
          periodEnd: new Date("2024-01-31"),
          actualPaid: 3000,
          discrepancyReason: null,
        }),
        makeSalaryRecord({
          id: "sr2",
          periodEnd: new Date("2024-02-29"),
          actualPaid: 2000,
          discrepancyReason: null,
        }),
      ],
    });
    expect(findings.some((f) => f.code === "PAYSLIP_DROP_NO_JUSTIFICATION")).toBe(true);
  });

  it("düşüş varsa ama yeterli gerekçe eklenmişse üretmez", () => {
    const findings = detectAnomalies({
      ...baseInput,
      salaryRecords: [
        makeSalaryRecord({
          id: "sr1",
          periodEnd: new Date("2024-01-31"),
          actualPaid: 3000,
        }),
        makeSalaryRecord({
          id: "sr2",
          periodEnd: new Date("2024-02-29"),
          actualPaid: 2000,
          discrepancyReason: "Çalışan 2 hafta ücretsiz izindeydi, HR onaylı.",
        }),
      ],
    });
    expect(findings.some((f) => f.code === "PAYSLIP_DROP_NO_JUSTIFICATION")).toBe(false);
  });

  it("%10'dan az düşüşte üretmez", () => {
    const findings = detectAnomalies({
      ...baseInput,
      salaryRecords: [
        makeSalaryRecord({ id: "sr1", periodEnd: new Date("2024-01-31"), actualPaid: 3000 }),
        makeSalaryRecord({ id: "sr2", periodEnd: new Date("2024-02-29"), actualPaid: 2950 }),
      ],
    });
    expect(findings.some((f) => f.code === "PAYSLIP_DROP_NO_JUSTIFICATION")).toBe(false);
  });

  it("farklı worker'ların kayıtlarını birbirine karıştırmaz", () => {
    const findings = detectAnomalies({
      ...baseInput,
      salaryRecords: [
        makeSalaryRecord({ id: "sr1", workerId: "w1", periodEnd: new Date("2024-01-31"), actualPaid: 3000 }),
        makeSalaryRecord({ id: "sr2", workerId: "w2", periodEnd: new Date("2024-02-29"), actualPaid: 500 }),
      ],
    });
    expect(findings.some((f) => f.code === "PAYSLIP_DROP_NO_JUSTIFICATION")).toBe(false);
  });
});

describe("detectAnomalies — mevcut davranış bozulmadı (regresyon)", () => {
  it("SALARY_DROP_NO_JUSTIFICATION (SalaryHistory bazlı) hâlâ çalışıyor", () => {
    const findings = detectAnomalies({
      ...baseInput,
      salaryHistory: [
        {
          id: "sh1",
          workerId: "w1",
          tenantId: "t1",
          effectiveDate: new Date("2024-01-01"),
          oldSalary: 40000,
          newSalary: 30000,
          reason: null,
          justification: null,
          approvedBy: null,
          createdByUserId: "u1",
          createdAt: new Date("2024-01-01"),
        } as never,
      ],
    });
    expect(findings.some((f) => f.code === "SALARY_DROP_NO_JUSTIFICATION")).toBe(true);
  });
});
