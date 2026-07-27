import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, withTenant } from "@/lib/api-context";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { detectAnomalies } from "@/lib/anomalies";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const workerId = searchParams.get("workerId") ?? undefined;
    const from = searchParams.get("dateFrom");
    const to = searchParams.get("dateTo");
    const dateFrom = from ? new Date(from) : undefined;
    const dateTo = to ? new Date(to) : undefined;

    return await withTenant(user, req, async () => {
      const workerFilter = workerId ? { id: workerId } : {};

      const workers = await prisma.worker.findMany({
        where: workerFilter,
        orderBy: { lastName: "asc" },
      });

      const ids = workers.map((w) => w.id);

      const [notifications, documents, salaryChanges, absences, changeLogs, salaryRecords] =
        await Promise.all([
          prisma.notificationEvent.findMany({
            where: {
              workerId: ids.length ? { in: ids } : undefined,
              ...(dateFrom || dateTo
                ? {
                    createdAt: {
                      ...(dateFrom ? { gte: dateFrom } : {}),
                      ...(dateTo ? { lte: dateTo } : {}),
                    },
                  }
                : {}),
            },
            include: {
              worker: {
                select: { firstName: true, lastName: true, id: true },
              },
            },
            take: 2000,
            orderBy: { createdAt: "desc" },
          }),
          prisma.document.findMany({
            where: {
              workerId: ids.length ? { in: ids } : undefined,
              isDeleted: false,
              ...(dateFrom || dateTo
                ? {
                    uploadDate: {
                      ...(dateFrom ? { gte: dateFrom } : {}),
                      ...(dateTo ? { lte: dateTo } : {}),
                    },
                  }
                : {}),
            },
            take: 2000,
            orderBy: { uploadDate: "desc" },
          }),
          prisma.salaryHistory.findMany({
            where: {
              workerId: ids.length ? { in: ids } : undefined,
              ...(dateFrom || dateTo
                ? {
                    effectiveDate: {
                      ...(dateFrom ? { gte: dateFrom } : {}),
                      ...(dateTo ? { lte: dateTo } : {}),
                    },
                  }
                : {}),
            },
            take: 2000,
            orderBy: { effectiveDate: "desc" },
          }),
          prisma.absenceRecord.findMany({
            where: {
              workerId: ids.length ? { in: ids } : undefined,
              ...(dateFrom || dateTo
                ? {
                    startDate: {
                      ...(dateFrom ? { gte: dateFrom } : {}),
                      ...(dateTo ? { lte: dateTo } : {}),
                    },
                  }
                : {}),
            },
            take: 2000,
            orderBy: { startDate: "desc" },
          }),
          prisma.workerChangeLog.findMany({
            where: {
              workerId: ids.length ? { in: ids } : undefined,
              ...(dateFrom || dateTo
                ? {
                    createdAt: {
                      ...(dateFrom ? { gte: dateFrom } : {}),
                      ...(dateTo ? { lte: dateTo } : {}),
                    },
                  }
                : {}),
            },
            take: 2000,
            orderBy: { createdAt: "desc" },
          }),
          prisma.salaryRecord.findMany({
            where: {
              workerId: ids.length ? { in: ids } : undefined,
              ...(dateFrom || dateTo
                ? {
                    periodEnd: {
                      ...(dateFrom ? { gte: dateFrom } : {}),
                      ...(dateTo ? { lte: dateTo } : {}),
                    },
                  }
                : {}),
            },
            take: 2000,
            orderBy: { periodEnd: "desc" },
          }),
        ]);

      const anomalies = detectAnomalies({
        workers,
        salaryRecords,
        salaryHistory: salaryChanges,
        changeLogs,
        documents,
        notifications,
      });

      return NextResponse.json({
        data: {
          workers,
          notifications,
          documents,
          salaryChanges,
          salaryRecords,
          absences,
          changeLogs,
          anomalies,
        },
      });
    });
  } catch (error) {
    logger.error("GET audit-pack failed", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
