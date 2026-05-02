import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/api-context";
import { requireAuthorisingOfficer } from "@/lib/admin-auth";
import {
  ensureEmailTemplatesForTenant,
  getOrCreateNotificationConfig,
} from "@/lib/notifications/email/notification-settings-store";
import { prismaBase } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const notificationConfigPatchSchema = z.object({
  emailEnabled: z.boolean().optional(),
  ccRecipients: z.string().max(12000).nullable().optional(),
  bccRecipients: z.string().max(12000).nullable().optional(),
  sendAfterExpired: z.boolean().optional(),
  visaRemind60Enabled: z.boolean().optional(),
  visaRemind60Days: z.number().int().min(1).max(730).optional(),
  visaRemind30Enabled: z.boolean().optional(),
  visaRemind30Days: z.number().int().min(1).max(730).optional(),
  visaRemind7Enabled: z.boolean().optional(),
  visaRemind7Days: z.number().int().min(1).max(730).optional(),
  visaRemindLastDayEnabled: z.boolean().optional(),
  sponsorshipRemind60Enabled: z.boolean().optional(),
  sponsorshipRemind60Days: z.number().int().min(1).max(730).optional(),
  sponsorshipRemind30Enabled: z.boolean().optional(),
  sponsorshipRemind30Days: z.number().int().min(1).max(730).optional(),
  sponsorshipRemind7Enabled: z.boolean().optional(),
  sponsorshipRemind7Days: z.number().int().min(1).max(730).optional(),
  sponsorshipRemindLastDayEnabled: z.boolean().optional(),
  rtwRemind60Enabled: z.boolean().optional(),
  rtwRemind60Days: z.number().int().min(1).max(730).optional(),
  rtwRemind30Enabled: z.boolean().optional(),
  rtwRemind30Days: z.number().int().min(1).max(730).optional(),
  rtwRemind7Enabled: z.boolean().optional(),
  rtwRemind7Days: z.number().int().min(1).max(730).optional(),
  rtwRemindLastDayEnabled: z.boolean().optional(),
  documentRemind60Enabled: z.boolean().optional(),
  documentRemind60Days: z.number().int().min(1).max(730).optional(),
  documentRemind30Enabled: z.boolean().optional(),
  documentRemind30Days: z.number().int().min(1).max(730).optional(),
  documentRemind7Enabled: z.boolean().optional(),
  documentRemind7Days: z.number().int().min(1).max(730).optional(),
  documentRemindLastDayEnabled: z.boolean().optional(),
});

export async function GET(req: NextRequest): Promise<NextResponse> {
  const user = await getSessionUser(req.headers);
  if (!requireAuthorisingOfficer(user)) {
    return NextResponse.json(
      { error: user ? "Forbidden" : "Unauthorized" },
      { status: user ? 403 : 401 }
    );
  }
  const tenantId = user.tenantId;
  const config = await getOrCreateNotificationConfig(prismaBase, tenantId);
  await ensureEmailTemplatesForTenant(prismaBase, tenantId);
  const templates = await prismaBase.emailTemplate.findMany({
    where: { tenantId },
    orderBy: { templateKey: "asc" },
  });
  return NextResponse.json({ config, templates });
}

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
  const parsed = notificationConfigPatchSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  if (Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ error: "Empty body" }, { status: 400 });
  }
  await getOrCreateNotificationConfig(prismaBase, tenantId);
  const config = await prismaBase.notificationConfig.update({
    where: { tenantId },
    data: parsed.data,
  });
  return NextResponse.json({ config });
}
