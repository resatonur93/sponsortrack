import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prismaBase } from "@/lib/prisma";
import { getSessionUser } from "@/lib/api-context";
import { requireAuthorisingOfficer } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const patchSchema = z
  .object({
    trusted: z.boolean().optional(),
    label: z.string().min(1).max(200).optional(),
  })
  .refine(
    (d) =>
      typeof d.trusted === "boolean" ||
      typeof d.label === "string",
    "At least one of trusted, label is required."
  );

export async function PATCH(
  req: NextRequest,
  { params }: { params: { deviceId: string } }
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

  const deviceId = params.deviceId.trim();
  if (!deviceId) return NextResponse.json({ error: "BAD_ID" }, { status: 400 });

  const row = await prismaBase.userTrustedDevice.findFirst({
    where: { id: deviceId, tenantId: user.tenantId },
  });
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const payload: {
    label?: string;
    trusted?: boolean;
    trustedAt?: Date | null;
  } = {};
  if (parsed.data.label !== undefined) {
    payload.label = parsed.data.label.trim();
  }
  if (parsed.data.trusted !== undefined) {
    payload.trusted = parsed.data.trusted;
    payload.trustedAt = parsed.data.trusted ? new Date() : null;
  }

  const updated = await prismaBase.userTrustedDevice.update({
    where: { id: row.id },
    data: payload,
  });

  return NextResponse.json(updated);
}
