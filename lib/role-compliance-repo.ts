import type { RoleCompliance } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type WorkerRoleSeed = {
  jobDescription: string | null;
  occupationCode: string;
  contractJobDescription: string | null;
  actualDayToDayDuties: string | null;
};

export async function ensureRoleComplianceRecord(
  workerId: string,
  tenantId: string,
  seed: WorkerRoleSeed
): Promise<RoleCompliance> {
  const existing = await prisma.roleCompliance.findUnique({
    where: { workerId },
  });
  if (existing) return existing;

  return prisma.roleCompliance.create({
    data: {
      workerId,
      tenantId,
      cosJobDescription: seed.jobDescription ?? "",
      cosOccupationCode: seed.occupationCode,
      contractDuties:
        seed.contractJobDescription ?? seed.jobDescription ?? "",
      internalJobDesc: seed.jobDescription ?? null,
      actualDuties: seed.actualDayToDayDuties ?? null,
      mismatchFlags: [],
      needsChangeOfEmployment: false,
    },
  });
}
