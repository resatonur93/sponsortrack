import { NextRequest, NextResponse } from "next/server";
import { OrgChangeStatus } from "@prisma/client";
import { getSessionUser, withTenant } from "@/lib/api-context";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

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

      const [
        totalWorkers,
        pendingReports,
        overdueReports,
        expiringVisas,
        expiringDocs,
        openOrgChanges,
        recentAudit,
      ] = await Promise.all([
        prisma.worker.count({
          where: { employmentStatus: { not: "TERMINATED" } },
        }),
        prisma.notificationEvent.count({ where: { status: "PENDING" } }),
        prisma.notificationEvent.count({ where: { status: "OVERDUE" } }),
        prisma.worker.count({
          where: {
            visaExpiryDate: { lte: in30, gte: now },
            employmentStatus: { not: "TERMINATED" },
          },
        }),
        prisma.document.count({
          where: {
            isDeleted: false,
            expiryDate: { lte: in30, gte: now },
          },
        }),
        prisma.orgChange.count({
          where: {
            status: {
              in: [
                OrgChangeStatus.PENDING,
                OrgChangeStatus.IN_PROGRESS,
                OrgChangeStatus.OVERDUE,
              ],
            },
          },
        }),
        prisma.auditLog.findMany({
          orderBy: { createdAt: "desc" },
          take: 25,
        }),
      ]);

      const performedIds = Array.from(new Set(recentAudit.map((a) => a.performedBy)));
      const actors =
        performedIds.length === 0
          ? []
          : await prisma.user.findMany({
              where: { id: { in: performedIds }, tenantId: user.tenantId },
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            });
      const actorMap = new Map(actors.map((u) => [u.id, u]));

      const enrichedAudit = recentAudit.map((row) => ({
        id: row.id,
        action: row.action,
        entityType: row.entityType,
        entityId: row.entityId,
        changes: row.changes,
        createdAt: row.createdAt.toISOString(),
        performedBy: row.performedBy,
        actor: actorMap.get(row.performedBy) ?? null,
      }));

      return NextResponse.json({
        data: {
          totalActiveWorkers: totalWorkers,
          pendingReports,
          overdueReports,
          visasExpiring30d: expiringVisas,
          documentsExpiring30d: expiringDocs,
          openOrganisationChanges: openOrgChanges,
          recentAuditLogs: enrichedAudit,
        },
      });
    });
  } catch (error) {
    logger.error("GET /api/compliance/summary failed", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
