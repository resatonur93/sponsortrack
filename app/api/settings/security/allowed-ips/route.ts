import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prismaBase } from "@/lib/prisma";
import { getSessionUser } from "@/lib/api-context";
import { requireAuthorisingOfficer } from "@/lib/admin-auth";
import { isValidIpRule } from "@/lib/security/ip-rule-validation";

export const dynamic = "force-dynamic";

const postSchema = z.object({
  label: z.string().min(1).max(160),
  cidr: z.string().min(3).max(120),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
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
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const cidr = parsed.data.cidr.trim();
  if (!isValidIpRule(cidr)) {
    return NextResponse.json({ error: "INVALID_CIDR" }, { status: 400 });
  }

  const last = await prismaBase.allowedIpRule.findFirst({
    where: { tenantId: user.tenantId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  const created = await prismaBase.allowedIpRule.create({
    data: {
      tenantId: user.tenantId,
      label: parsed.data.label.trim(),
      cidr,
      sortOrder: (last?.sortOrder ?? 0) + 1,
      isActive: true,
    },
  });

  return NextResponse.json(created, { status: 201 });
}
