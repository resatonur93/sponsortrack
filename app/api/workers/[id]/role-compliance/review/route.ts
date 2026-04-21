import { NextRequest, NextResponse } from "next/server";
import type { Worker } from "@prisma/client";
import { getSessionUser, withTenant } from "@/lib/api-context";
import { prisma } from "@/lib/prisma";
import { roleComplianceReviewSchema } from "@/lib/schemas";
import { logger } from "@/lib/logger";
import {
  computeRoleMismatchFlags,
  flagsImplyChangeOfEmployment,
} from "@/lib/role-compliance-flags";
import { ensureRoleComplianceRecord } from "@/lib/role-compliance-repo";

export const dynamic = "force-dynamic";

type RouteParams = { params: { id: string } };

export async function POST(
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
    const parsed = roleComplianceReviewSchema.safeParse(body);
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
          lastReviewed: new Date(),
          reviewedBy: user.id,
          ...(p.actualDuties !== undefined && { actualDuties: p.actualDuties }),
          ...(p.internalJobDesc !== undefined && {
            internalJobDesc: p.internalJobDesc,
          }),
        },
      });

      const mismatchFlags = computeRoleMismatchFlags(rc, worker);
      const needsChangeOfEmployment = flagsImplyChangeOfEmployment(mismatchFlags);

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
    logger.error(
      "POST /api/workers/[id]/role-compliance/review failed",
      error
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
