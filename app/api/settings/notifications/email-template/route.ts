import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/api-context";
import { requireAuthorisingOfficer } from "@/lib/admin-auth";
import { canonicalTemplateCatalogKeys } from "@/lib/notifications/email/default-templates";
import { getOrCreateNotificationConfig } from "@/lib/notifications/email/notification-settings-store";
import { prismaBase } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const allowedKeys = new Set(canonicalTemplateCatalogKeys());

const bodySchema = z.object({
  templateKey: z.string().min(1).max(200),
  subjectTr: z.string().min(1).max(998),
  subjectEn: z.string().min(1).max(998),
  bodyTr: z.string().min(1).max(120_000),
  bodyEn: z.string().min(1).max(120_000),
});

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const user = await getSessionUser(req.headers);
  if (!requireAuthorisingOfficer(user)) {
    return NextResponse.json(
      { error: user ? "Forbidden" : "Unauthorized" },
      { status: user ? 403 : 401 }
    );
  }
  const tenantId = user.tenantId;
  const raw: unknown = await req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  if (!allowedKeys.has(parsed.data.templateKey)) {
    return NextResponse.json({ error: "Unknown templateKey" }, { status: 400 });
  }

  await getOrCreateNotificationConfig(prismaBase, tenantId);

  const template = await prismaBase.emailTemplate.update({
    where: {
      tenantId_templateKey: { tenantId, templateKey: parsed.data.templateKey },
    },
    data: {
      subjectTr: parsed.data.subjectTr,
      subjectEn: parsed.data.subjectEn,
      bodyTr: parsed.data.bodyTr,
      bodyEn: parsed.data.bodyEn,
    },
  });
  return NextResponse.json({ template });
}
