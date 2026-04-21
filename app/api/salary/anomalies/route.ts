import { NextRequest, NextResponse } from "next/server";
import type { SalaryRecord } from "@prisma/client";
import { getSessionUser, withTenant } from "@/lib/api-context";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { computeExpectedForPeriod } from "@/lib/salary-record-utils";

export const dynamic = "force-dynamic";

type Row = SalaryRecord & {
  expectedForPeriod: number;
  worker: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
};

function enrich(
  r: SalaryRecord & {
    worker: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
    };
  }
): Row {
  return {
    ...r,
    expectedForPeriod: computeExpectedForPeriod(
      r.contractedSalary,
      r.periodStart,
      r.periodEnd
    ),
  };
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const limit = Math.min(
      500,
      Math.max(1, parseInt(req.nextUrl.searchParams.get("limit") ?? "100", 10) || 100)
    );

    return await withTenant(user, req, async () => {
      const rows = await prisma.salaryRecord.findMany({
        where: { isCompliant: false },
        orderBy: { periodEnd: "desc" },
        take: limit,
        include: {
          worker: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      return NextResponse.json({
        data: rows.map(enrich),
      });
    });
  } catch (error) {
    logger.error("GET /api/salary/anomalies failed", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
