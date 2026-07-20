import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { getSessionUser, withTenant } from "@/lib/api-context";
import { prisma } from "@/lib/prisma";
import { vacancyUpdateSchema } from "@/lib/schemas";
import { logger } from "@/lib/logger";

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
      const row = await prisma.vacancy.findFirst({ where: { id: params.id } });
      if (!row) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      return NextResponse.json({ data: row });
    });
  } catch (error) {
    logger.error("GET /api/vacancies/[id] failed", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body: unknown = await req.json();
    const parsed = vacancyUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const p = parsed.data;

    return await withTenant(user, req, async () => {
      const existing = await prisma.vacancy.findFirst({ where: { id: params.id } });
      if (!existing) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      if (existing.status === "CONVERTED") {
        return NextResponse.json(
          { error: "Bu vacancy zaten bir çalışana dönüştürülmüş." },
          { status: 409 }
        );
      }

      const data: Prisma.VacancyUpdateInput = {};
      if (p.jobTitle !== undefined) data.jobTitle = p.jobTitle;
      if (p.occupationCode !== undefined) data.occupationCode = p.occupationCode;
      if (p.proposedSalary !== undefined) data.proposedSalary = p.proposedSalary;
      if (p.hoursPerWeek !== undefined) data.hoursPerWeek = p.hoursPerWeek;
      if (p.workLocation !== undefined) data.workLocation = p.workLocation;
      if (p.jobDescription !== undefined) data.jobDescription = p.jobDescription;
      if (p.genuineVacancyChecklist !== undefined) {
        data.genuineVacancyChecklist =
          p.genuineVacancyChecklist as unknown as Prisma.InputJsonValue;
      }
      if (p.genuineVacancyNotes !== undefined)
        data.genuineVacancyNotes = p.genuineVacancyNotes;
      if (p.status !== undefined) data.status = p.status;
      if (p.notes !== undefined) data.notes = p.notes;

      const updated = await prisma.vacancy.update({
        where: { id: params.id },
        data,
      });
      return NextResponse.json({ data: updated });
    });
  } catch (error) {
    logger.error("PUT /api/vacancies/[id] failed", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return await withTenant(user, req, async () => {
      const existing = await prisma.vacancy.findFirst({ where: { id: params.id } });
      if (!existing) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      if (existing.status === "CONVERTED") {
        return NextResponse.json(
          { error: "Bu vacancy zaten bir çalışana dönüştürülmüş." },
          { status: 409 }
        );
      }
      await prisma.vacancy.delete({ where: { id: params.id } });
      return NextResponse.json({ data: { id: params.id } });
    });
  } catch (error) {
    logger.error("DELETE /api/vacancies/[id] failed", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
