import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, withTenant } from "@/lib/api-context";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { smsDraftGenerateBodySchema } from "@/lib/schemas";
import { getComplianceEvidenceList } from "@/lib/compliance-reporting-engine";
import { buildHoSmsReportText } from "@/lib/ho-sms-templates";

export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

export async function POST(
  req: NextRequest,
  { params }: Params
): Promise<NextResponse> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: unknown = await req.json().catch(() => ({}));
    const parsed = smsDraftGenerateBodySchema.safeParse(
      typeof body === "object" && body !== null ? body : {}
    );
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    return await withTenant(user, req, async () => {
      const event = await prisma.complianceEvent.findFirst({
        where: { id: params.id },
      });
      if (!event) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      const worker = await prisma.worker.findFirst({
        where: { id: event.workerId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          cosReference: true,
          cosAssignDate: true,
          salary: true,
          workLocation: true,
        },
      });
      if (!worker) {
        return NextResponse.json({ error: "Worker not found" }, { status: 404 });
      }

      const latestSalaryHistory = await prisma.salaryHistory.findFirst({
        where: { workerId: worker.id },
        orderBy: { effectiveDate: "desc" },
        select: {
          oldSalary: true,
          newSalary: true,
          effectiveDate: true,
        },
      });

      const ov = parsed.data.overrides;
      const smsText = buildHoSmsReportText(
        event.eventType,
        event.eventDate,
        event.reportDeadline,
        {
          firstName: worker.firstName,
          lastName: worker.lastName,
          cosReference: worker.cosReference,
          cosAssignDate: worker.cosAssignDate,
          salary: worker.salary,
          workLocation: worker.workLocation,
        },
        {
          salaryHistory: latestSalaryHistory,
          overrides: ov
            ? {
                oldSalary: ov.oldSalary,
                newSalary: ov.newSalary,
                oldWorkLocation: ov.oldWorkLocation ?? undefined,
                newWorkLocation: ov.newWorkLocation ?? undefined,
              }
            : undefined,
        }
      );

      const draft = await prisma.smsReportDraft.create({
        data: {
          eventId: event.id,
          smsText,
          evidenceChecklist: getComplianceEvidenceList(event.eventType),
          deadline: event.reportDeadline,
          internalNotes: parsed.data.internalNotes ?? undefined,
          generatedBy: user.id,
          tenantId: user.tenantId,
        },
        include: {
          event: {
            select: {
              id: true,
              eventType: true,
              worker: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  cosReference: true,
                },
              },
            },
          },
        },
      });

      await prisma.complianceEvent.update({
        where: { id: event.id },
        data: { smsDraft: smsText },
      });

      return NextResponse.json({ data: draft }, { status: 201 });
    });
  } catch (e) {
    logger.error("POST /api/events/[id]/generate-sms failed", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
