import { NextRequest, NextResponse } from "next/server";
import { WorkflowStepStatus } from "@prisma/client";
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
      const rows = await prisma.workflowStep.findMany({
        where: {
          assignedTo: user.id,
          status: {
            in: [
              WorkflowStepStatus.PENDING,
              WorkflowStepStatus.IN_PROGRESS,
            ],
          },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
        include: {
          event: {
            select: {
              id: true,
              eventType: true,
              workflowState: true,
              status: true,
              reportDeadline: true,
              worker: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      return NextResponse.json({ data: rows });
    });
  } catch (e) {
    logger.error("GET /api/workflow/my-assignments failed", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
