const DAY_MS = 86400000;
const TOLERANCE_GBP = 100;

export function computeExpectedForPeriod(
  annualContractedGbp: number,
  periodStart: Date,
  periodEnd: Date
): number {
  const days = Math.max(
    1,
    Math.round((periodEnd.getTime() - periodStart.getTime()) / DAY_MS)
  );
  return Math.round((annualContractedGbp * days) / 365);
}

export function evaluateSalaryCompliance(
  contractedAnnual: number,
  actualPaid: number,
  periodStart: Date,
  periodEnd: Date,
  tolerance = TOLERANCE_GBP
): {
  isCompliant: boolean;
  expectedForPeriod: number;
  discrepancyReason: string | null;
} {
  const expectedForPeriod = computeExpectedForPeriod(
    contractedAnnual,
    periodStart,
    periodEnd
  );

  if (actualPaid + tolerance >= expectedForPeriod) {
    return {
      isCompliant: true,
      expectedForPeriod,
      discrepancyReason: null,
    };
  }

  const reason = `Underpayment: pro-rated expectation ~£${expectedForPeriod} for period, paid £${actualPaid}`;
  return {
    isCompliant: false,
    expectedForPeriod,
    discrepancyReason: reason,
  };
}

const COS_THRESHOLD_TOLERANCE = 0.95;
const HOURS_TOLERANCE_RATIO = 0.1;

/** contractedSalary, çalışanın CoS'ta taahhüt edilen maaşının (Worker.salary) belirgin şekilde altındaysa true. */
export function checkBelowCosThreshold(
  contractedSalary: number,
  cosSalary: number
): boolean {
  if (!cosSalary || cosSalary <= 0) return false;
  return contractedSalary < cosSalary * COS_THRESHOLD_TOLERANCE;
}

/**
 * hoursWorked, Worker.contractedHoursPerWeek'e göre dönem uzunluğuna pro-rata edilmiş beklenen
 * saatten belirgin şekilde (±%10) farklıysa true. İki değerden biri eksikse kontrol atlanır (false).
 */
export function checkHoursDiscrepancy(
  hoursWorked: number | null | undefined,
  contractedHoursPerWeek: number | null | undefined,
  periodStart: Date,
  periodEnd: Date
): boolean {
  if (hoursWorked == null || contractedHoursPerWeek == null) return false;
  if (contractedHoursPerWeek <= 0) return false;
  const days = Math.max(
    1,
    Math.round((periodEnd.getTime() - periodStart.getTime()) / DAY_MS)
  );
  const expectedHours = (contractedHoursPerWeek * days) / 7;
  if (expectedHours <= 0) return false;
  return Math.abs(hoursWorked - expectedHours) > expectedHours * HOURS_TOLERANCE_RATIO;
}

export type SalaryDeductionCategory =
  | "ACCOMMODATION"
  | "UNIFORM"
  | "TRAINING"
  | "RECRUITMENT_FEE"
  | "OTHER";

export type SalaryDeductionItem = {
  label: string;
  amount: number;
  category: SalaryDeductionCategory;
};

export const DISALLOWED_DEDUCTION_CATEGORIES: SalaryDeductionCategory[] = [
  "ACCOMMODATION",
  "UNIFORM",
  "TRAINING",
  "RECRUITMENT_FEE",
];

/** Eski (serbest Json) veya bozuk veri için güvenli ayrıştırma — tanınmayan şekilde boş dizi döner. */
export function parseDeductions(value: unknown): SalaryDeductionItem[] {
  if (!Array.isArray(value)) return [];
  const out: SalaryDeductionItem[] = [];
  for (const item of value) {
    if (
      item &&
      typeof item === "object" &&
      typeof (item as { label?: unknown }).label === "string" &&
      typeof (item as { amount?: unknown }).amount === "number" &&
      typeof (item as { category?: unknown }).category === "string"
    ) {
      out.push(item as SalaryDeductionItem);
    }
  }
  return out;
}

export function hasDisallowedDeduction(deductions: SalaryDeductionItem[]): boolean {
  return deductions.some(
    (d) => DISALLOWED_DEDUCTION_CATEGORIES.includes(d.category) && d.amount > 0
  );
}

export function parseSalaryCsvDate(value: string): Date | null {
  const t = value.trim();
  if (!t) return null;
  const d = new Date(t);
  if (!Number.isNaN(d.getTime())) return d;
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(t);
  if (m) {
    const [, dd, mm, yyyy] = m;
    const x = new Date(`${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`);
    if (!Number.isNaN(x.getTime())) return x;
  }
  return null;
}
