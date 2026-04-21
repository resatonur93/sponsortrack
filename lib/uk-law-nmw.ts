/**
 * Reference NLW (National Living Wage) for age 21+ — illustrative only.
 * Update periodically from https://www.gov.uk/national-minimum-wage-rates
 */
export const DEFAULT_NLW_HOURLY_GBP = 11.44;

export function impliedHourlyFromAnnualSalary(
  annualSalaryGbp: number,
  hoursPerWeek: number
): number {
  if (!Number.isFinite(annualSalaryGbp) || !Number.isFinite(hoursPerWeek)) {
    return NaN;
  }
  if (hoursPerWeek <= 0) return NaN;
  return annualSalaryGbp / (hoursPerWeek * 52);
}

export function assessNmwFromAnnualSalary(
  annualSalaryGbp: number,
  hoursPerWeek: number,
  referenceNlwHourlyGbp: number = DEFAULT_NLW_HOURLY_GBP
): {
  impliedHourly: number;
  compliant: boolean;
  referenceNlwHourlyGbp: number;
} {
  const impliedHourly = impliedHourlyFromAnnualSalary(
    annualSalaryGbp,
    hoursPerWeek
  );
  if (Number.isNaN(impliedHourly)) {
    return {
      impliedHourly: NaN,
      compliant: false,
      referenceNlwHourlyGbp,
    };
  }
  const compliant = impliedHourly + 1e-9 >= referenceNlwHourlyGbp;
  return { impliedHourly, compliant, referenceNlwHourlyGbp };
}
