import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { getSessionUser, withTenant } from "@/lib/api-context";
import { prisma } from "@/lib/prisma";
import { absenceCreateSchema } from "@/lib/schemas";
import { logger } from "@/lib/logger";
import { AbsenceStatus } from "@prisma/client";
import {
  computeAbsenceWorkingDayMetrics,
  deriveIsAuthorised,
} from "@/lib/absence-record-compute";
import { triggerUnauthorisedAbsence10DayIfNeeded } from "@/lib/absence-notification-trigger";

export const dynamic = "force-dynamic";

type RouteParams = { params: { id: string } };

export async function GET(
  req: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return await withTenant(user, req, async () => {
      const worker = await prisma.worker.findFirst({
        where: { id: params.id },
        select: { id: true },
      });
      if (!worker) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      const rows = await prisma.absenceRecord.findMany({
        where: { workerId: params.id },
        orderBy: { startDate: "desc" },
      });
      return NextResponse.json({ data: rows });
    });
  } catch (error) {
    logger.error("GET absences failed", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body: unknown = await req.json();
    const parsed = absenceCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const d = parsed.data;

    return await withTenant(user, req, async () => {
      const worker = await prisma.worker.findFirst({
        where: { id: params.id },
        select: { id: true },
      });
      if (!worker) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      const startDate = new Date(d.startDate);
      const endDate = d.endDate ? new Date(d.endDate) : null;
      if (endDate && endDate.getTime() < startDate.getTime()) {
        return NextResponse.json(
          { error: "endDate must be on or after startDate" },
          { status: 400 }
        );
      }

      const isAuthorised = d.isAuthorised ?? deriveIsAuthorised(d.type);
      const { consecutiveWorkingDays, isReportable } =
        computeAbsenceWorkingDayMetrics(startDate, endDate, d.type);

      const row = await prisma.absenceRecord.create({
        data: {
          workerId: params.id,
          tenantId: user.tenantId,
          startDate,
          endDate: endDate ?? undefined,
          type: d.type,
          status: d.status ?? AbsenceStatus.ACTIVE,
          isAuthorised,
          approvedBy: d.approvedBy ?? undefined,
          reason: d.reason ?? undefined,
          notes: d.notes ?? undefined,
          contactAttempts: (d.contactAttempts ??
            []) as unknown as Prisma.InputJsonValue,
          returnToWorkDate: d.returnToWorkDate
            ? new Date(d.returnToWorkDate)
            : undefined,
          returnToWorkNotes: d.returnToWorkNotes ?? undefined,
          consecutiveWorkingDays,
          isReportable,
        },
      });

      await triggerUnauthorisedAbsence10DayIfNeeded({
        workerId: params.id,
        tenantId: user.tenantId,
      });

      return NextResponse.json({ data: row }, { status: 201 });
    });
  } catch (error) {
    logger.error("POST absences failed", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
