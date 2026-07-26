import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prismaBase } from "@/lib/prisma";
import { getSessionUser } from "@/lib/api-context";
import { requireAuthorisingOfficer } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  licenceType: z.string().trim().max(200).nullable().optional(),
  licenceRating: z.string().trim().max(200).nullable().optional(),
  licenceExpiryDate: z
    .string()
    .datetime()
    .nullable()
    .optional()
    .transform((v) => (v ? new Date(v) : v)),
});

export async function GET(req: NextRequest): Promise<NextResponse> {
  const user = await getSessionUser(req.headers);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const tenant = await prismaBase.tenant.findUnique({
    where: { id: user.tenantId },
    select: {
      companyName: true,
      licenceNumber: true,
      licenceType: true,
      licenceRating: true,
      licenceExpiryDate: true,
    },
  });
  return NextResponse.json({ data: tenant });
}

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

  const updated = await prismaBase.tenant.update({
    where: { id: user.tenantId },
    data: parsed.data,
    select: {
      companyName: true,
      licenceNumber: true,
      licenceType: true,
      licenceRating: true,
      licenceExpiryDate: true,
    },
  });

  return NextResponse.json({ data: updated });
}
