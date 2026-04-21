import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, withTenant } from "@/lib/api-context";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { workflowNotesSchema } from "@/lib/schemas";
import { managerReviewApprove } from "@/lib/event-workflow-service";

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
      try {
        const data = await managerReviewApprove(
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
                msg.includes("No pending")
              ? 403
              : 409;
        return NextResponse.json({ error: msg }, { status });
      }
    });
  } catch (e) {
    logger.error("POST /api/events/[id]/review failed", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
