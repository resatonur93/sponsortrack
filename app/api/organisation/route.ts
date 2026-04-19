import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, withTenant } from "@/lib/api-context";
import { prisma } from "@/lib/prisma";
import { organisationChangeSchema } from "@/lib/schemas";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return await withTenant(user, req, async () => {
      const rows = await prisma.organisationChange.findMany({
        orderBy: { createdAt: "desc" },
        take: 200,
      });
      return NextResponse.json({ data: rows });
    });
  } catch (error) {
    logger.error("GET /api/organisation failed", error);
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
    const parsed = organisationChangeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const d = parsed.data;

    return await withTenant(user, req, async () => {
      const row = await prisma.organisationChange.create({
        data: {
          tenantId: user.tenantId,
          title: d.title,
          description: d.description ?? undefined,
          occurredAt: d.occurredAt ? new Date(d.occurredAt) : undefined,
          reportDeadlineAt: d.reportDeadlineAt
            ? new Date(d.reportDeadlineAt)
            : undefined,
        },
      });
      return NextResponse.json({ data: row }, { status: 201 });
    });
  } catch (error) {
    logger.error("POST /api/organisation failed", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
