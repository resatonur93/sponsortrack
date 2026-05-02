import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prismaBase } from "@/lib/prisma";
import { getSessionUser } from "@/lib/api-context";
import { requireAuthorisingOfficer } from "@/lib/admin-auth";
import { isValidIpRule } from "@/lib/security/ip-rule-validation";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  label: z.string().min(1).max(160).optional(),
  cidr: z.string().min(3).max(120).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(10_000).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { ruleId: string } }
): Promise<NextResponse> {
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

  if (parsed.data.cidr !== undefined && !isValidIpRule(parsed.data.cidr)) {
    return NextResponse.json({ error: "INVALID_CIDR" }, { status: 400 });
  }

  const tid = params.ruleId.trim();
  if (!tid) {
    return NextResponse.json({ error: "BAD_ID" }, { status: 400 });
  }

  const prev = await prismaBase.allowedIpRule.findFirst({
    where: { id: tid, tenantId: user.tenantId },
  });
  if (!prev) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const data = {
    ...(parsed.data.label !== undefined ? { label: parsed.data.label.trim() } : {}),
    ...(parsed.data.cidr !== undefined ? { cidr: parsed.data.cidr.trim() } : {}),
    ...(parsed.data.isActive !== undefined ? { isActive: parsed.data.isActive } : {}),
    ...(parsed.data.sortOrder !== undefined
      ? { sortOrder: parsed.data.sortOrder }
      : {}),
  };

  const updated = await prismaBase.allowedIpRule.update({
    where: { id: prev.id },
    data,
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { ruleId: string } }
): Promise<NextResponse> {
  const user = await getSessionUser(req.headers);
  if (!requireAuthorisingOfficer(user)) {
    return NextResponse.json(
      { error: user ? "Forbidden" : "Unauthorized" },
      { status: user ? 403 : 401 }
    );
  }

  const tid = params.ruleId.trim();
  const res = await prismaBase.allowedIpRule.deleteMany({
    where: { id: tid, tenantId: user.tenantId },
  });

  if (res.count === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
