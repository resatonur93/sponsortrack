import { NextRequest, NextResponse } from "next/server";
import type { RoleCompliance, Worker } from "@prisma/client";
import { getSessionUser, withTenant } from "@/lib/api-context";
import { prisma } from "@/lib/prisma";
import { roleComplianceUpdateSchema } from "@/lib/schemas";
import { logger } from "@/lib/logger";
import {
  computeRoleMismatchFlags,
  flagsImplyChangeOfEmployment,
} from "@/lib/role-compliance-flags";
import { ensureRoleComplianceRecord } from "@/lib/role-compliance-repo";

export const dynamic = "force-dynamic";

type RouteParams = { params: { id: string } };

type WorkerFlagCtx = Pick<Worker, "occupationCode" | "jobTitle">;

function applyFlags(
  rc: RoleCompliance,
  worker: WorkerFlagCtx,
  needsOverride?: boolean
): { mismatchFlags: string[]; needsChangeOfEmployment: boolean } {
  const flags = computeRoleMismatchFlags(rc, worker);
  return {
    mismatchFlags: flags,
    needsChangeOfEmployment:
      needsOverride !== undefined
        ? needsOverride
        : flagsImplyChangeOfEmployment(flags),
  };
}

export async function GET(
  req: NextRequest,
  context: RouteParams
): Promise<NextResponse> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const workerId = context.params.id;

    return await withTenant(user, req, async () => {
      const worker = await prisma.worker.findFirst({
        where: { id: workerId },
        select: {
          id: true,
          jobTitle: true,
          occupationCode: true,
          jobDescription: true,
          contractJobDescription: true,
          actualDayToDayDuties: true,
        },
      });
      if (!worker) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      let rc = await ensureRoleComplianceRecord(workerId, user.tenantId, worker);
      const { mismatchFlags, needsChangeOfEmployment } = applyFlags(rc, worker);

      const flagsEqual =
        mismatchFlags.length === rc.mismatchFlags.length &&
        mismatchFlags.every((f) => rc.mismatchFlags.includes(f));
      if (!flagsEqual || needsChangeOfEmployment !== rc.needsChangeOfEmployment) {
        rc = await prisma.roleCompliance.update({
          where: { id: rc.id },
          data: { mismatchFlags, needsChangeOfEmployment },
        });
      }

      return NextResponse.json({
        data: {
          roleCompliance: rc,
          workerContext: {
            jobTitle: worker.jobTitle,
            occupationCode: worker.occupationCode,
          },
        },
      });
    });
  } catch (error) {
    logger.error("GET /api/workers/[id]/role-compliance failed", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  context: RouteParams
): Promise<NextResponse> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const workerId = context.params.id;
    const body: unknown = await req.json();
    const parsed = roleComplianceUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    return await withTenant(user, req, async () => {
      const worker = await prisma.worker.findFirst({
        where: { id: workerId },
        select: {
          id: true,
          jobTitle: true,
          occupationCode: true,
          jobDescription: true,
          contractJobDescription: true,
          actualDayToDayDuties: true,
        },
      });
      if (!worker) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      let rc = await ensureRoleComplianceRecord(workerId, user.tenantId, worker);
      const p = parsed.data;

      rc = await prisma.roleCompliance.update({
        where: { id: rc.id },
        data: {
          ...(p.cosJobDescription !== undefined && {
            cosJobDescription: p.cosJobDescription,
          }),
          ...(p.cosOccupationCode !== undefined && {
            cosOccupationCode: p.cosOccupationCode,
          }),
          ...(p.contractDuties !== undefined && {
            contractDuties: p.contractDuties,
          }),
          ...(p.internalJobDesc !== undefined && {
            internalJobDesc: p.internalJobDesc,
          }),
          ...(p.actualDuties !== undefined && { actualDuties: p.actualDuties }),
        },
      });

      const { mismatchFlags, needsChangeOfEmployment } = applyFlags(
        rc,
        worker,
        p.needsChangeOfEmployment
      );

      rc = await prisma.roleCompliance.update({
        where: { id: rc.id },
        data: { mismatchFlags, needsChangeOfEmployment },
      });

      return NextResponse.json({
        data: {
          roleCompliance: rc,
          workerContext: {
            jobTitle: worker.jobTitle,
            occupationCode: worker.occupationCode,
          },
        },
      });
    });
  } catch (error) {
    logger.error("PUT /api/workers/[id]/role-compliance failed", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
