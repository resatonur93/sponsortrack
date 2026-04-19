import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, withTenant } from "@/lib/api-context";
import { prisma } from "@/lib/prisma";
import { computeRiskScore } from "@/lib/risk-score";
import { logger } from "@/lib/logger";
import { evaluateMissingDocuments } from "@/lib/required-documents";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return await withTenant(user, req, async () => {
      const now = new Date();
      const in30 = new Date(now);
      in30.setDate(in30.getDate() + 30);
      const in90 = new Date(now);
      in90.setDate(in90.getDate() + 90);

      const [
        totalWorkers,
        activeWorkers,
        notifications,
        recent,
        visa30,
        visa90not30,
      ] = await Promise.all([
        prisma.worker.count(),
        prisma.worker.count({ where: { employmentStatus: "ACTIVE" } }),
        prisma.notificationEvent.findMany({
          where: {
            status: { in: ["PENDING", "OVERDUE"] },
          },
          select: { status: true },
        }),
        prisma.notificationEvent.findMany({
          orderBy: { createdAt: "desc" },
          take: 10,
          include: {
            worker: {
              select: { firstName: true, lastName: true, id: true },
            },
          },
        }),
        prisma.worker.count({
          where: {
            visaExpiryDate: { not: null, lte: in30, gte: now },
            employmentStatus: { not: "TERMINATED" },
          },
        }),
        prisma.worker.count({
          where: {
            visaExpiryDate: {
              not: null,
              gt: in30,
              lte: in90,
            },
            employmentStatus: { not: "TERMINATED" },
          },
        }),
      ]);

      const risk = computeRiskScore({
        notifications,
        workersWithVisaExpiringIn30Days: visa30,
        workersWithVisaExpiringIn90DaysNot30: visa90not30,
      });

      const workersForDocs = await prisma.worker.findMany({
        where: { employmentStatus: { not: "TERMINATED" } },
        include: {
          documents: { where: { isDeleted: false } },
        },
      });
      let missingDocumentIssues = 0;
      const highPriorityMissing: {
        workerId: string;
        name: string;
        labels: string[];
      }[] = [];
      for (const w of workersForDocs) {
        const miss = evaluateMissingDocuments(w, w.documents, now).filter(
          (m) => m.reason === "missing" || m.reason === "expired"
        );
        missingDocumentIssues += miss.length;
        const highs = miss.filter((m) => m.urgency === "HIGH");
        if (highs.length > 0) {
          highPriorityMissing.push({
            workerId: w.id,
            name: `${w.firstName} ${w.lastName}`,
            labels: highs.map((h) => h.label),
          });
        }
      }

      return NextResponse.json({
        data: {
          stats: {
            totalWorkers,
            activeSponsorships: activeWorkers,
            pendingNotifications: notifications.filter((n) => n.status === "PENDING")
              .length,
            overdueNotifications: notifications.filter((n) => n.status === "OVERDUE")
              .length,
            missingDocumentIssues,
          },
          highPriorityMissing: highPriorityMissing.slice(0, 12),
          risk,
          recentEvents: recent,
        },
      });
    });
  } catch (error) {
    logger.error("GET /api/dashboard failed", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
