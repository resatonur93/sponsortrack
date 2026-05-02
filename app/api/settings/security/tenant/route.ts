import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prismaBase } from "@/lib/prisma";
import { getSessionUser } from "@/lib/api-context";
import { requireAuthorisingOfficer } from "@/lib/admin-auth";
import { getOrCreateTenantSecurity } from "@/lib/security/tenant-login-ip";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  enforceIpWhitelist: z.boolean().optional(),
  sessionIdleTimeoutMinutes: z
    .number()
    .int()
    .min(5)
    .max(60 * 24 * 14)
    .nullable()
    .optional(),
  sessionAbsoluteMaxMinutes: z
    .number()
    .int()
    .min(15)
    .max(60 * 24 * 45)
    .nullable()
    .optional(),
});

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const user = await getSessionUser(req.headers);
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
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await getOrCreateTenantSecurity(user.tenantId);
  const updated = await prismaBase.tenantSecuritySettings.update({
    where: { tenantId: user.tenantId },
    data: parsed.data,
  });

  return NextResponse.json(updated);
}
