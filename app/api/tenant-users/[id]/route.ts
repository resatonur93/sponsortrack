import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, withTenant } from "@/lib/api-context";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { tenantUserUpdateSchema } from "@/lib/schemas";
import { parsePageAccessOverrides } from "@/lib/authorization/page-access";

export const dynamic = "force-dynamic";

type RouteParams = { params: { id: string } };

const MANAGE_ROLES = new Set(["AUTHORISING_OFFICER", "SYSTEM_ADMIN"]);

/** Rol ve sayfa-erişim istisnalarını günceller — yalnızca AO / SYSTEM_ADMIN, yalnızca kendi kiracısındaki kullanıcılar için. */
export async function PATCH(
  req: NextRequest,
  context: RouteParams
): Promise<NextResponse> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!MANAGE_ROLES.has(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const targetId = context.params.id;
    if (targetId === user.id) {
      return NextResponse.json(
        { error: "Kendi yetkilerinizi bu ekrandan değiştiremezsiniz." },
        { status: 400 }
      );
    }

    const body: unknown = await req.json();
    const parsed = tenantUserUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    return await withTenant(user, req, async () => {
      const existing = await prisma.user.findFirst({
        where: { id: targetId },
        select: { id: true, pageAccessOverrides: true },
      });
      if (!existing) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      const nextOverrides =
        parsed.data.pageAccessOverrides !== undefined
          ? {
              ...parsePageAccessOverrides(existing.pageAccessOverrides),
              ...parsed.data.pageAccessOverrides,
            }
          : undefined;

      // Not: prisma.user.update({ where: { id } }) burada kasıtlı olarak KULLANILMIYOR.
      // Tenant-scope middleware'i (lib/prisma.ts) unique update/delete için where'i
      // { AND: [{ id }, { tenantId }] } şeklinde sarmalıyor; Prisma'nın "extended
      // whereUnique" doğrulaması bunu kabul etmiyor ("needs at least one of id or
      // email") çünkü unique alan üst seviyede düz olarak bulunmalı. updateMany bu
      // sorunu yaşamıyor çünkü unique-where şartı aramıyor.
      await prisma.user.updateMany({
        where: { id: targetId },
        data: {
          role: parsed.data.role,
          pageAccessOverrides: nextOverrides,
        },
      });
      const updated = await prisma.user.findFirst({
        where: { id: targetId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          isActive: true,
          pageAccessOverrides: true,
        },
      });
      if (!updated) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      return NextResponse.json({
        data: {
          ...updated,
          pageAccessOverrides: parsePageAccessOverrides(updated.pageAccessOverrides),
        },
      });
    });
  } catch (e) {
    logger.error("PATCH /api/tenant-users/[id] failed", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
