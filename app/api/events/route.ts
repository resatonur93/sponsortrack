import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, withTenant } from "@/lib/api-context";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { complianceEventCreateSchema } from "@/lib/schemas";
import {
  createComplianceReportingEvent,
  refreshComplianceEventOverdueStatuses,
} from "@/lib/compliance-reporting-engine";
import type { EventStatus, EventType, Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return await withTenant(user, req, async () => {
      await refreshComplianceEventOverdueStatuses(user.tenantId);

      const { searchParams } = new URL(req.url);
      const status = searchParams.get("status") as EventStatus | null;
      const workerId = searchParams.get("workerId")?.trim() || null;
      const eventType = searchParams.get("eventType") as EventType | null;
      const dateFrom = searchParams.get("dateFrom");
      const dateTo = searchParams.get("dateTo");

      const where: Prisma.ComplianceEventWhereInput = {
        tenantId: user.tenantId,
      };
      if (status) where.status = status;
      if (workerId) where.workerId = workerId;
      if (eventType) where.eventType = eventType;
      if (dateFrom || dateTo) {
        where.eventDate = {};
        if (dateFrom) where.eventDate.gte = new Date(dateFrom);
        if (dateTo) {
          const end = new Date(dateTo);
          end.setHours(23, 59, 59, 999);
          where.eventDate.lte = end;
        }
      }

      const rows = await prisma.complianceEvent.findMany({
        where,
        orderBy: [{ reportDeadline: "asc" }, { createdAt: "desc" }],
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
          _count: { select: { workflowSteps: true } },
        },
        take: 500,
      });

      return NextResponse.json({
        data: rows.map(({ _count, ...r }) => ({
          ...r,
          workflowStepCount: _count.workflowSteps,
        })),
      });
    });
  } catch (e) {
    logger.error("GET /api/events failed", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body: unknown = await req.json();
    const parsed = complianceEventCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const d = parsed.data;

    return await withTenant(user, req, async () => {
      const worker = await prisma.worker.findFirst({
        where: { id: d.workerId, tenantId: user.tenantId },
      });
      if (!worker) {
        return NextResponse.json({ error: "Worker not found" }, { status: 404 });
      }

      const eventDate = d.eventDate ? new Date(d.eventDate) : new Date();
      const created = await createComplianceReportingEvent({
        tenantId: user.tenantId,
        workerId: worker.id,
        eventType: d.eventType,
        eventDate,
        workerName: `${worker.firstName} ${worker.lastName}`,
        cosReference: worker.cosReference,
        notes: d.notes,
      });

      const full = await prisma.complianceEvent.findUnique({
        where: { id: created.id },
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
      });

      return NextResponse.json({ data: full }, { status: 201 });
    });
  } catch (e) {
    logger.error("POST /api/events failed", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
