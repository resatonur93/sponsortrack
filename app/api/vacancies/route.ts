import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { getSessionUser, withTenant } from "@/lib/api-context";
import { prisma } from "@/lib/prisma";
import { vacancyCreateSchema } from "@/lib/schemas";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return await withTenant(user, req, async () => {
      const rows = await prisma.vacancy.findMany({
        orderBy: { createdAt: "desc" },
        take: 300,
      });
      return NextResponse.json({ data: rows });
    });
  } catch (error) {
    logger.error("GET /api/vacancies failed", error);
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
    const parsed = vacancyCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const d = parsed.data;

    return await withTenant(user, req, async () => {
      const row = await prisma.vacancy.create({
        data: {
          tenantId: user.tenantId,
          jobTitle: d.jobTitle,
          occupationCode: d.occupationCode,
          proposedSalary: d.proposedSalary,
          hoursPerWeek: d.hoursPerWeek ?? undefined,
          workLocation: d.workLocation,
          jobDescription: d.jobDescription,
          genuineVacancyChecklist: (d.genuineVacancyChecklist ??
            undefined) as Prisma.InputJsonValue | undefined,
          genuineVacancyNotes: d.genuineVacancyNotes ?? undefined,
          status: d.status ?? undefined,
          notes: d.notes ?? undefined,
          createdByUserId: user.id,
        },
      });
      return NextResponse.json({ data: row }, { status: 201 });
    });
  } catch (error) {
    logger.error("POST /api/vacancies failed", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
