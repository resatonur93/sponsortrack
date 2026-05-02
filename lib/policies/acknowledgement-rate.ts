import { prisma } from "@/lib/prisma";

export type PolicyAckRate = {
  ackCount: number;
  ratePercent: number;
  userTotal: number;
};

export async function getAcknowledgementRatesForPolicies(
  tenantId: string,
  policyIds: string[]
): Promise<Map<string, PolicyAckRate>> {
  const result = new Map<string, PolicyAckRate>();
  if (policyIds.length === 0) return result;

  const userTotal = await prisma.user.count({
    where: { tenantId, isActive: true },
  });

  const grouped = await prisma.acknowledgement.groupBy({
    by: ["policyId"],
    where: { tenantId, policyId: { in: policyIds } },
    _count: { _all: true },
  });
  const countByPolicy = new Map(
    grouped.map((g) => [g.policyId, g._count._all] as const)
  );

  for (const id of policyIds) {
    const ackCount = countByPolicy.get(id) ?? 0;
    const ratePercent =
      userTotal === 0 ? 0 : Math.min(100, Math.round((ackCount / userTotal) * 100));
    result.set(id, { ackCount, ratePercent, userTotal });
  }
  return result;
}
