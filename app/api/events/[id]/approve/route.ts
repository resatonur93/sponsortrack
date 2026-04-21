import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, withTenant } from "@/lib/api-context";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { workflowNotesSchema } from "@/lib/schemas";
import { authorisingOfficerApprove } from "@/lib/event-workflow-service";
import { Role } from "@prisma/client";

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
    const parsed = workflowNotesSchema.safeParse(
      typeof body === "object" && body !== null ? body : {}
    );
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    return await withTenant(user, req, async () => {
      const existing = await prisma.complianceEvent.findFirst({
        where: { id: params.id, tenantId: user.tenantId },
        include: { _count: { select: { workflowSteps: true } } },
      });
      if (!existing) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      if (
        existing.status === "CANCELLED" ||
        existing.status === "REPORTED"
      ) {
        return NextResponse.json(
          { error: "Invalid status for approval" },
          { status: 409 }
        );
      }

      if (
        existing.workflowState === "AO_APPROVAL" &&
        existing._count.workflowSteps > 0
      ) {
        try {
          const data = await authorisingOfficerApprove(
            prisma,
            user,
            params.id,
            parsed.data
          );
          return NextResponse.json({ data });
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Failed";
          const status =
            msg === "Not found"
              ? 404
              : msg.includes("not assigned") ||
                  msg.includes("not awaiting") ||
                  msg.includes("No pending") ||
                  msg.includes("Authorising Officer")
                ? 403
                : 409;
          return NextResponse.json({ error: msg }, { status });
        }
      }

      if (
        existing._count.workflowSteps === 0 &&
        user.role === Role.AUTHORISING_OFFICER
      ) {
        const updated = await prisma.complianceEvent.update({
          where: { id: params.id },
          data: {
            status: "APPROVED",
            approvedBy: user.id,
            workflowState: "REPORTED",
          },
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
            workflowSteps: {
              orderBy: { createdAt: "asc" },
              include: {
                assignee: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    role: true,
                  },
                },
                actionedByUser: {
                  select: { id: true, firstName: true, lastName: true },
                },
              },
            },
          },
        });
        return NextResponse.json({ data: updated });
      }

      if (existing.workflowState === "DRAFT") {
        return NextResponse.json(
          {
            error:
              "Submit the event for approval workflow first (HR submit).",
          },
          { status: 409 }
        );
      }

      return NextResponse.json(
        {
          error:
            "Use workflow steps: manager review → compliance → AO approval.",
        },
        { status: 409 }
      );
    });
  } catch (e) {
    logger.error("POST /api/events/[id]/approve failed", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
