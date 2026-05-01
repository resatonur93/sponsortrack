import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, withTenant } from "@/lib/api-context";
import { prisma } from "@/lib/prisma";
import { computeRiskScore } from "@/lib/risk-score";
import { logger } from "@/lib/logger";
import { evaluateMissingDocuments } from "@/lib/required-documents";
import {
  VISA_EXPIRING_TYPES,
  dedupeVisaExpiringByWorker,
} from "@/lib/recent-notifications";

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
        visaAlertRows,
        nonVisaRecentRows,
        visa30,
        visa90not30,
        recentAlerts,
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
          where: {
            status: { in: ["PENDING", "OVERDUE"] },
            eventType: { in: VISA_EXPIRING_TYPES },
          },
          include: {
            worker: {
              select: { firstName: true, lastName: true, id: true },
            },
          },
        }),
        prisma.notificationEvent.findMany({
          where: {
            eventType: { notIn: VISA_EXPIRING_TYPES },
          },
          orderBy: { createdAt: "desc" },
          take: 15,
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
        prisma.alert.findMany({
          where: { dismissedAt: null },
          orderBy: { createdAt: "desc" },
          take: 5,
          include: {
            worker: {
              select: { id: true, firstName: true, lastName: true },
            },
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
      const missingDocumentsTable: {
        workerId: string;
        name: string;
        highCount: number;
        mediumCount: number;
        lowCount: number;
        labels: string[];
      }[] = [];
      for (const w of workersForDocs) {
        const missAll = evaluateMissingDocuments(w, w.documents, now);
        missingDocumentIssues += missAll.length;
        const highs = missAll.filter((m) => m.urgency === "HIGH");
        if (highs.length > 0) {
          highPriorityMissing.push({
            workerId: w.id,
            name: `${w.firstName} ${w.lastName}`,
            labels: highs.map((h) => h.label),
          });
        }
        if (missAll.length > 0) {
          missingDocumentsTable.push({
            workerId: w.id,
            name: `${w.firstName} ${w.lastName}`,
            highCount: missAll.filter((m) => m.urgency === "HIGH").length,
            mediumCount: missAll.filter((m) => m.urgency === "MEDIUM").length,
            lowCount: missAll.filter((m) => m.urgency === "LOW").length,
            labels: missAll.map((m) => m.label),
          });
        }
      }
      missingDocumentsTable.sort((a, b) => {
        if (b.highCount !== a.highCount) return b.highCount - a.highCount;
        if (b.mediumCount !== a.mediumCount) return b.mediumCount - a.mediumCount;
        if (b.lowCount !== a.lowCount) return b.lowCount - a.lowCount;
        return a.name.localeCompare(b.name);
      });

      const visaDeduped = dedupeVisaExpiringByWorker(visaAlertRows);
      const recentForDashboard = [...visaDeduped, ...nonVisaRecentRows]
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        .slice(0, 10);

      return NextResponse.json(
        {
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
            missingDocumentsTable: missingDocumentsTable.slice(0, 20),
            risk,
            recentEvents: recentForDashboard,
            recentAlerts,
          },
        },
        {
          headers: {
            "Cache-Control": "private, no-store, max-age=0, must-revalidate",
          },
        }
      );
    });
  } catch (error) {
    logger.error("GET /api/dashboard failed", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
