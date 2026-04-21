import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, withTenant } from "@/lib/api-context";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  buildAuditWorkerWhere,
  parseAuditWorkerFilters,
} from "@/lib/audit-worker-filters";
import { evaluateMissingDocuments } from "@/lib/required-documents";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const limit = Math.min(
      500,
      Math.max(
        1,
        parseInt(req.nextUrl.searchParams.get("limit") ?? "100", 10) || 100
      )
    );

    return await withTenant(user, req, async () => {
      const filters = parseAuditWorkerFilters(req.nextUrl.searchParams);
      const where = await buildAuditWorkerWhere(prisma, filters);

      const rows = await prisma.worker.findMany({
        where,
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        take: limit,
        include: {
          documents: { where: { isDeleted: false } },
        },
      });

      const now = new Date();
      const data = rows.map((w) => {
        const miss = evaluateMissingDocuments(w, w.documents, now).filter(
          (m) => m.reason === "missing" || m.reason === "expired"
        );
        return {
          id: w.id,
          firstName: w.firstName,
          lastName: w.lastName,
          email: w.email,
          cosReference: w.cosReference,
          employmentStatus: w.employmentStatus,
          complianceRiskLevel: w.complianceRiskLevel,
          visaExpiryDate: w.visaExpiryDate?.toISOString() ?? null,
          missingDocumentCount: miss.length,
          missingHigh: miss.filter((m) => m.urgency === "HIGH").length,
        };
      });

      return NextResponse.json({ data });
    });
  } catch (e) {
    logger.error("GET /api/audit/workers failed", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
