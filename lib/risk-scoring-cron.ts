import { prismaBase } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  computeOrganisationFactors,
  computeWorkerOnlyFactors,
  factorsToPrismaJson,
  mergeFactors,
  riskLevelToComplianceLevel,
  type OrgChangeDbShape,
  type WorkerRiskDbShape,
} from "@/lib/risk-scoring-engine";

export async function runRiskScoringForTenant(
  tenantId: string
): Promise<{ workers: number }> {
  const [workers, orgChanges] = await Promise.all([
    prismaBase.worker.findMany({
      where: {
        tenantId,
        employmentStatus: { not: "TERMINATED" },
      },
      include: {
        documents: {
          where: { isDeleted: false },
          select: {
            documentType: true,
            isDeleted: true,
            expiryDate: true,
          },
        },
        documentVaults: {
          where: { isDeleted: false },
          select: { folder: true, isDeleted: true },
        },
        notifications: {
          select: {
            eventType: true,
            status: true,
            dueDate: true,
            reportDeadlineAt: true,
          },
        },
        complianceEvents: {
          select: {
            eventType: true,
            status: true,
            reportDeadline: true,
          },
        },
        alerts: {
          where: { dismissedAt: null },
          select: { alertType: true, dismissedAt: true },
        },
        absences: {
          select: { type: true, status: true },
        },
        roleCompliance: {
          select: {
            needsChangeOfEmployment: true,
            mismatchFlags: true,
            lastReviewed: true,
          },
        },
        salaryRecords: {
          orderBy: { periodEnd: "desc" },
          take: 3,
          select: {
            isCompliant: true,
            contractedSalary: true,
            actualPaid: true,
            periodStart: true,
            periodEnd: true,
          },
        },
      },
    }),
    prismaBase.orgChange.findMany({
      where: { tenantId },
      select: {
        id: true,
        changeType: true,
        status: true,
        reportedToHO: true,
      },
    }),
  ]);

  const now = new Date();
  const orgFactors = computeOrganisationFactors(
    orgChanges as OrgChangeDbShape[],
    workers as unknown as WorkerRiskDbShape[],
    now
  );

  const orgOnly = mergeFactors([], orgFactors);

  await prismaBase.$transaction(async (tx) => {
    await tx.riskScore.deleteMany({ where: { tenantId } });

    await tx.riskScore.create({
      data: {
        tenantId,
        isTenantAggregate: true,
        workerId: null,
        score: orgOnly.score,
        level: orgOnly.level,
        factors: factorsToPrismaJson(orgOnly.factors),
      },
    });

    for (const w of workers) {
      const shape = w as unknown as WorkerRiskDbShape;
      const wf = computeWorkerOnlyFactors(shape, now);
      const merged = mergeFactors(wf, orgFactors);

      await tx.riskScore.create({
        data: {
          tenantId,
          workerId: w.id,
          isTenantAggregate: false,
          score: merged.score,
          level: merged.level,
          factors: factorsToPrismaJson(merged.factors),
        },
      });

      await tx.worker.update({
        where: { id: w.id },
        data: {
          complianceRiskLevel: riskLevelToComplianceLevel(merged.level),
        },
      });
    }
  });

  return { workers: workers.length };
}

export async function runRiskScoringAllTenants(): Promise<{
  tenants: number;
  workers: number;
}> {
  const tenants = await prismaBase.tenant.findMany({
    select: { id: true },
  });
  let workers = 0;
  for (const t of tenants) {
    try {
      const r = await runRiskScoringForTenant(t.id);
      workers += r.workers;
    } catch (e) {
      logger.error("risk scoring tenant failed", e, { tenantId: t.id });
    }
  }
  return { tenants: tenants.length, workers };
}
