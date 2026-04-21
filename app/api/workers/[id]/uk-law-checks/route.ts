import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getSessionUser, withTenant } from "@/lib/api-context";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { ukLawCheckUpdateSchema } from "@/lib/schemas";
import {
  serializeUkLawCheck,
  toDec,
} from "@/lib/uk-law-check-utils";

export const dynamic = "force-dynamic";

type RouteParams = { params: { id: string } };

function buildUpdateInput(
  d: Record<string, unknown>
): Prisma.UkLawCheckUpdateInput {
  const data: Prisma.UkLawCheckUpdateInput = {};
  const p = d as {
    nmwCompliant?: boolean | null;
    hourlyRate?: number | string | null;
    hoursPerWeek?: number | string | null;
    weeklyHours?: number | string | null;
    maxWeeklyHours?: number | string;
    optOutSigned?: boolean;
    annualEntitlement?: number | string;
    daysTaken?: number | string | null;
    daysRemaining?: number | string | null;
    contractIssued?: string | null;
    contractType?: string;
    flags?: string[];
  };
  if (p.nmwCompliant !== undefined) data.nmwCompliant = p.nmwCompliant;
  if (p.hourlyRate !== undefined) data.hourlyRate = toDec(p.hourlyRate);
  if (p.hoursPerWeek !== undefined) data.hoursPerWeek = toDec(p.hoursPerWeek);
  if (p.weeklyHours !== undefined) data.weeklyHours = toDec(p.weeklyHours);
  if (p.maxWeeklyHours !== undefined) {
    const x = toDec(p.maxWeeklyHours);
    if (x) data.maxWeeklyHours = x;
  }
  if (p.optOutSigned !== undefined) data.optOutSigned = p.optOutSigned;
  if (p.annualEntitlement !== undefined) {
    const x = toDec(p.annualEntitlement);
    if (x) data.annualEntitlement = x;
  }
  if (p.daysTaken !== undefined) data.daysTaken = toDec(p.daysTaken);
  if (p.daysRemaining !== undefined) data.daysRemaining = toDec(p.daysRemaining);
  if (p.contractIssued !== undefined) {
    data.contractIssued =
      p.contractIssued === null || p.contractIssued === ""
        ? null
        : new Date(p.contractIssued);
  }
  if (p.contractType !== undefined) data.contractType = p.contractType;
  if (p.flags !== undefined) data.flags = p.flags;
  return data;
}

export async function GET(
  req: NextRequest,
  context: RouteParams
): Promise<NextResponse> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const workerId = context.params.id;

    return await withTenant(user, req, async () => {
      const worker = await prisma.worker.findFirst({
        where: { id: workerId },
        select: { id: true },
      });
      if (!worker) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      const row = await prisma.ukLawCheck.findFirst({
        where: { workerId },
      });
      return NextResponse.json({
        data: row ? serializeUkLawCheck(row) : null,
      });
    });
  } catch (e) {
    logger.error("GET /api/workers/[id]/uk-law-checks failed", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
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
    const workerId = context.params.id;
    const body: unknown = await req.json();
    const parsed = ukLawCheckUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    return await withTenant(user, req, async () => {
      const worker = await prisma.worker.findFirst({
        where: { id: workerId },
        select: { id: true },
      });
      if (!worker) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      const d = parsed.data;
      const patch = buildUpdateInput(d as Record<string, unknown>);
      const existing = await prisma.ukLawCheck.findFirst({
        where: { workerId },
      });

      let row;
      if (!existing) {
        row = await prisma.ukLawCheck.create({
          data: {
            workerId,
            tenantId: user.tenantId,
            contractType: d.contractType ?? "permanent",
            flags: d.flags ?? [],
            optOutSigned: d.optOutSigned ?? false,
            maxWeeklyHours:
              toDec(d.maxWeeklyHours) ?? new Prisma.Decimal(48),
            annualEntitlement:
              toDec(d.annualEntitlement) ?? new Prisma.Decimal(28),
            nmwCompliant: d.nmwCompliant ?? null,
            hourlyRate: toDec(d.hourlyRate),
            hoursPerWeek: toDec(d.hoursPerWeek),
            weeklyHours: toDec(d.weeklyHours),
            daysTaken: toDec(d.daysTaken),
            daysRemaining: toDec(d.daysRemaining),
            ...(d.contractIssued !== undefined
              ? {
                  contractIssued: d.contractIssued
                    ? new Date(d.contractIssued)
                    : null,
                }
              : {}),
          },
        });
      } else {
        row = await prisma.ukLawCheck.update({
          where: { id: existing.id },
          data: patch,
        });
      }

      return NextResponse.json({ data: serializeUkLawCheck(row) });
    });
  } catch (e) {
    logger.error("PUT /api/workers/[id]/uk-law-checks failed", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
