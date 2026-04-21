import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/api-context";
import { prismaBase } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (sessionUser.role !== "SYSTEM_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const users = await prismaBase.user.findMany({
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
