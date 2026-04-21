import type { RoleCompliance, Worker } from "@prisma/client";

function tokenize(s: string): Set<string> {
  const parts = s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 2);
  return new Set(parts);
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let inter = 0;
  a.forEach((x) => {
    if (b.has(x)) inter += 1;
  });
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

export type RoleComplianceSnapshot = Pick<
  RoleCompliance,
  | "cosJobDescription"
  | "cosOccupationCode"
  | "contractDuties"
  | "actualDuties"
>;

export function computeRoleMismatchFlags(
  rc: RoleComplianceSnapshot,
  worker: Pick<Worker, "occupationCode" | "jobTitle">
): string[] {
  const flags: string[] = [];
  const cosNorm = rc.cosJobDescription.trim();
  const contractNorm = rc.contractDuties.trim();
  const actual = (rc.actualDuties ?? "").trim();

  if (
    worker.occupationCode.trim() !== rc.cosOccupationCode.trim()
  ) {
    flags.push("code_risk");
  }

  if (actual.length > 0 && (cosNorm.length > 0 || contractNorm.length > 0)) {
    const ta = tokenize(actual);
    const simCos = cosNorm.length > 0 ? jaccard(ta, tokenize(cosNorm)) : 0;
    const simContract =
      contractNorm.length > 0 ? jaccard(ta, tokenize(contractNorm)) : 0;
    const best = Math.max(simCos, simContract);
    if (best < 0.18) {
      flags.push("duty_drift");
    }
  }

  const titleTok = tokenize(worker.jobTitle);
  const cosSnippet = tokenize(cosNorm.slice(0, 400));
  if (titleTok.size > 0 && cosSnippet.size > 0) {
    let hit = 0;
    titleTok.forEach((t) => {
      if (cosSnippet.has(t)) hit += 1;
    });
    if (hit / titleTok.size < 0.3) {
      flags.push("title_mismatch");
    }
  }

  return Array.from(new Set(flags));
}

export function flagsImplyChangeOfEmployment(flags: string[]): boolean {
  return flags.length > 0;
}
