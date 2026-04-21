import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { AbsenceType } from "@prisma/client";
import { getSessionUser, withTenant } from "@/lib/api-context";
import { prisma } from "@/lib/prisma";
import { absenceUpdateSchema } from "@/lib/schemas";
import { logger } from "@/lib/logger";
import {
  computeAbsenceWorkingDayMetrics,
  deriveIsAuthorised,
} from "@/lib/absence-record-compute";
import { triggerUnauthorisedAbsence10DayIfNeeded } from "@/lib/absence-notification-trigger";

export const dynamic = "force-dynamic";

type RouteParams = { params: { id: string } };

function asAttemptList(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return [...raw];
  return [];
}

export async function PUT(
  req: NextRequest,
  context: RouteParams
): Promise<NextResponse> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = context.params;
    const body: unknown = await req.json();
    const parsed = absenceUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const p = parsed.data;

    return await withTenant(user, req, async () => {
      const existing = await prisma.absenceRecord.findFirst({
        where: { id },
      });
      if (!existing) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      const nextType = p.type ?? existing.type;
      const attemptsForRule =
        p.contactAttempts !== undefined
          ? p.contactAttempts
          : (asAttemptList(existing.contactAttempts) as {
              date: string;
              method: string;
              result: string;
            }[]);

      if (
        nextType === AbsenceType.UNAUTHORISED &&
        attemptsForRule.length < 1
      ) {
        return NextResponse.json(
          {
            error:
              "Unauthorised absence requires at least one contact attempt on file",
          },
          { status: 400 }
        );
      }

      const nextStart = existing.startDate;
      const nextEnd =
        p.endDate !== undefined
          ? p.endDate
            ? new Date(p.endDate)
            : null
          : existing.endDate;
      if (nextEnd && nextEnd.getTime() < nextStart.getTime()) {
        return NextResponse.json(
          { error: "endDate must be on or after startDate" },
          { status: 400 }
        );
      }

      const isAuthorised =
        p.isAuthorised ??
        (p.type !== undefined
          ? deriveIsAuthorised(p.type)
          : existing.isAuthorised);

      const { consecutiveWorkingDays, isReportable } =
        computeAbsenceWorkingDayMetrics(nextStart, nextEnd, nextType);

      const data: Prisma.AbsenceRecordUpdateInput = {
        consecutiveWorkingDays,
        isReportable,
        isAuthorised,
      };
      if (p.endDate !== undefined) data.endDate = nextEnd;
      if (p.type !== undefined) data.type = p.type;
      if (p.status !== undefined) data.status = p.status;
      if (p.approvedBy !== undefined) data.approvedBy = p.approvedBy;
      if (p.reason !== undefined) data.reason = p.reason;
      if (p.notes !== undefined) data.notes = p.notes;
      if (p.contactAttempts !== undefined) {
        data.contactAttempts =
          p.contactAttempts as unknown as Prisma.InputJsonValue;
      }
      if (p.returnToWorkDate !== undefined) {
        data.returnToWorkDate = p.returnToWorkDate
          ? new Date(p.returnToWorkDate)
          : null;
      }
      if (p.returnToWorkNotes !== undefined) {
        data.returnToWorkNotes = p.returnToWorkNotes;
      }

      const updated = await prisma.absenceRecord.update({
        where: { id },
        data,
      });

      await triggerUnauthorisedAbsence10DayIfNeeded({
        workerId: existing.workerId,
        tenantId: user.tenantId,
      });

      return NextResponse.json({ data: updated });
    });
  } catch (error) {
    logger.error("PUT /api/absences/[id] failed", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
