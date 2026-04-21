import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, withTenant } from "@/lib/api-context";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { workflowEscalateSchema } from "@/lib/schemas";
import { escalateEventWorkflow } from "@/lib/event-workflow-service";

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
    const body: unknown = await req.json();
    const parsed = workflowEscalateSchema.safeParse(
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
        const data = await escalateEventWorkflow(
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
            : msg.includes("Not allowed") || msg.includes("Cannot escalate")
              ? 403
              : 400;
        return NextResponse.json({ error: msg }, { status });
      }
    });
  } catch (e) {
    logger.error("POST /api/events/[id]/escalate failed", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
