/** UK sponsor rule: supplementary employment must be <=20h/week and in the same occupation code or a shortage occupation. */
export function computeSupplementaryEmploymentFlags(input: {
  hoursPerWeek: number;
  isSameOccupation: boolean;
  isShortageOccupation: boolean;
}): string[] {
  const flags: string[] = [];
  if (input.hoursPerWeek > 20) {
    flags.push("hours_breach");
  }
  if (!input.isSameOccupation && !input.isShortageOccupation) {
    flags.push("occupation_mismatch");
  }
  return flags;
}
