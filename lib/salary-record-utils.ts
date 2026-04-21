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
