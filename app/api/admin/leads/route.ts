import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { LeadStatus } from "@prisma/client";
import { z } from "zod";
import { getSessionUser } from "@/lib/api-context";
import { prismaBase } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { requireAuthorisingOfficer } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const createLeadSchema = z.object({
  email: z.string().email(),
  name: z.string().max(200).optional().nullable(),
  companyName: z.string().max(200).optional().nullable(),
  phone: z.string().max(80).optional().nullable(),
  source: z.string().max(120).optional().default("admin_manual"),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const user = await getSessionUser();
    if (!requireAuthorisingOfficer(user)) {
      return NextResponse.json(
        { error: user ? "Forbidden" : "Unauthorized" },
        { status: user ? 403 : 401 }
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = createLeadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { email, name, companyName, phone, source } = parsed.data;

    const lead = await prismaBase.lead.create({
      data: {
        email: email.trim().toLowerCase(),
        name: name?.trim() || null,
        companyName: companyName?.trim() || null,
        phone: phone?.trim() || null,
        source: source.trim() || "admin_manual",
        status: LeadStatus.NEW,
        activities: {
          create: {
            type: "ADMIN_CREATE",
            message: "Manual lead created from admin panel.",
            userId: user.id,
          },
        },
      },
    });

    return NextResponse.json({ data: lead }, { status: 201 });
  } catch (e) {
    logger.error("POST /api/admin/leads failed", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const user = await getSessionUser();
    if (!requireAuthorisingOfficer(user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get("status");
    const sourceParam = searchParams.get("source")?.trim();
    const search = searchParams.get("search")?.trim();
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const sortBy = searchParams.get("sortBy") ?? "createdAt_desc";
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10) || 20));

    const where: Prisma.LeadWhereInput = { isDeleted: false };

    if (statusParam && Object.values(LeadStatus).includes(statusParam as LeadStatus)) {
      where.status = statusParam as LeadStatus;
    }
    if (sourceParam) {
      where.source = sourceParam;
    }
    if (search) {
      where.OR = [
        { email: { contains: search, mode: "insensitive" } },
        { companyName: { contains: search, mode: "insensitive" } },
        { name: { contains: search, mode: "insensitive" } },
      ];
    }
    const createdFilter: Prisma.DateTimeFilter = {};
    if (dateFrom) {
      const d = new Date(dateFrom);
      if (!Number.isNaN(d.getTime())) createdFilter.gte = d;
    }
    if (dateTo) {
      const d = new Date(dateTo);
      if (!Number.isNaN(d.getTime())) {
        d.setHours(23, 59, 59, 999);
        createdFilter.lte = d;
      }
    }
    if (Object.keys(createdFilter).length > 0) {
      where.createdAt = createdFilter;
    }

    const orderBy =
      sortBy === "createdAt_asc"
        ? { createdAt: "asc" as const }
        : sortBy === "status_asc"
          ? { status: "asc" as const }
          : { createdAt: "desc" as const };

    const [total, rows] = await Promise.all([
      prismaBase.lead.count({ where }),
      prismaBase.lead.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          assignee: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      }),
    ]);

    return NextResponse.json({
      data: rows,
      meta: { total, page, limit },
    });
  } catch (e) {
    logger.error("GET /api/admin/leads failed", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
