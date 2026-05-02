import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prismaBase } from "@/lib/prisma";
import { getSessionUser } from "@/lib/api-context";
import { requireAuthorisingOfficer } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  scope: z.enum(["self_other", "self_all", "tenant_all"]),
});

/**
 * Oturum kayıtlarını iptal et (JWT hâlâ cookie’de kalır; talepler `getSessionUser` ile reddedilir).
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const user = await getSessionUser(req.headers);
  if (!requireAuthorisingOfficer(user)) {
    return NextResponse.json(
      { error: user ? "Forbidden" : "Unauthorized" },
      { status: user ? 403 : 401 }
    );
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    raw = {};
  }

  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const scope = parsed.data.scope;
  const now = new Date();

  if (scope === "self_other") {
    if (!user.authSid) {
      return NextResponse.json(
        { error: "NO_CURRENT_SID" },
        { status: 400 }
      );
    }
    const r = await prismaBase.userAuthSession.updateMany({
      where: {
        tenantId: user.tenantId,
        userId: user.id,
        revokedAt: null,
        sessionToken: { not: user.authSid },
      },
      data: { revokedAt: now },
    });
    return NextResponse.json({ ok: true, affected: r.count });
  }

  if (scope === "self_all") {
    const r = await prismaBase.userAuthSession.updateMany({
      where: {
        tenantId: user.tenantId,
        userId: user.id,
        revokedAt: null,
      },
      data: { revokedAt: now },
    });
    return NextResponse.json({ ok: true, affected: r.count });
  }

  /** tenant_all */
  const r = await prismaBase.userAuthSession.updateMany({
    where: {
      tenantId: user.tenantId,
      revokedAt: null,
    },
    data: { revokedAt: now },
  });
  return NextResponse.json({ ok: true, affected: r.count });
}
