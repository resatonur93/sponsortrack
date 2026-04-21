import { NextRequest, NextResponse } from "next/server";
import type { UkLawCheck } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { getSessionUser, withTenant } from "@/lib/api-context";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  anomalyReasonsForCheck,
  hasUkLawAnomaly,
  serializeUkLawCheck,
} from "@/lib/uk-law-check-utils";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return await withTenant(user, req, async () => {
      const candidates = await prisma.ukLawCheck.findMany({
        where: {
          tenantId: user.tenantId,
          OR: [
            { flags: { isEmpty: false } },
            { nmwCompliant: false },
            {
              AND: [{ weeklyHours: { not: null } }, { optOutSigned: false }],
            },
            {
              daysRemaining: { lt: new Prisma.Decimal(0) },
            },
          ],
        },
        include: {
          worker: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              cosReference: true,
            },
          },
        },
        orderBy: { updatedAt: "desc" },
        take: 500,
      });

      const data = candidates
        .filter((row) => hasUkLawAnomaly(row))
        .map((row) => {
          const { worker, ...check } = row;
          const c = check as UkLawCheck;
          return {
            check: serializeUkLawCheck(c),
            reasons: anomalyReasonsForCheck(c),
            worker,
          };
        });

      return NextResponse.json({ data });
    });
  } catch (e) {
    logger.error("GET /api/uk-law/anomalies failed", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
