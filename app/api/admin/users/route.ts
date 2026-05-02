import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { Role } from "@prisma/client";
import { getSessionUser } from "@/lib/api-context";
import { prismaBase } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { requireAuthorisingOfficer } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const sessionUser = await getSessionUser();
    if (!requireAuthorisingOfficer(sessionUser)) {
      return NextResponse.json(
        { error: sessionUser ? "Forbidden" : "Unauthorized" },
        { status: sessionUser ? 403 : 401 }
      );
    }

    const roleParam = req.nextUrl.searchParams.get("role")?.trim();
    const tenantParam = req.nextUrl.searchParams.get("tenantId")?.trim();

    const where: Prisma.UserWhereInput = {};
    if (roleParam && (Object.values(Role) as string[]).includes(roleParam)) {
      where.role = roleParam as Role;
    }
    if (tenantParam) {
      where.tenantId = tenantParam;
    }

    const users = await prismaBase.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
        tenant: {
          select: {
            id: true,
            companyName: true,
            licenceNumber: true,
            isActive: true,
          },
        },
      },
    });

    return NextResponse.json(
      { data: users },
      {
        headers: {
          "Cache-Control": "private, no-store, max-age=0",
        },
      }
    );
  } catch (e) {
    logger.error("GET /api/admin/users failed", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
