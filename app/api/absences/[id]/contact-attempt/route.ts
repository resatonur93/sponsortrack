import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { getSessionUser, withTenant } from "@/lib/api-context";
import { prisma } from "@/lib/prisma";
import { absenceContactAttemptSchema } from "@/lib/schemas";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

type RouteParams = { params: { id: string } };

export async function POST(
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
    const parsed = absenceContactAttemptSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const row = parsed.data;

    return await withTenant(user, req, async () => {
      const existing = await prisma.absenceRecord.findFirst({
        where: { id },
      });
      if (!existing) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      const list = Array.isArray(existing.contactAttempts)
        ? [...(existing.contactAttempts as unknown[])]
        : [];
      list.push({
        date: row.date,
        method: row.method,
        result: row.result,
      });

      const updated = await prisma.absenceRecord.update({
        where: { id },
        data: {
          contactAttempts: list as Prisma.InputJsonValue,
        },
      });

      return NextResponse.json({ data: updated });
    });
  } catch (error) {
    logger.error("POST /api/absences/[id]/contact-attempt failed", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
