import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/api-context";
import { requireAuthorisingOfficer } from "@/lib/admin-auth";
import { getAdminPanelEmail } from "@/lib/admin-panel-access";
import {
  buildExpiryReminderEmailHtml,
  buildExpiryReminderPlainTextFallback,
  buildSampleExpiryReminderInput,
} from "@/lib/emails/templates/expiry-reminder-template";
import { joinSmtpRecipients } from "@/lib/email/recipient-parse";
import { isSmtpConfigured, sendSmtpMailDetailed } from "@/lib/email/smtp";
import { loadNotificationConfigForTenant } from "@/lib/notifications/email/notification-settings-store";
import { prismaBase } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const variantEnum = z.enum(["visa", "cos", "sponsorship", "rtw", "document"]);

const bodySchema = z.object({
  to: z.string().email().optional(),
  /** Ayarlıysa süre uyarısı için tam HTML kart şablonu gönderilir. */
  htmlPreviewVariant: variantEnum.optional(),
});

/** Bildirim / CC / BCC yolundan örnek e-posta; genel SMTP testinden ayrılır. */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const user = await getSessionUser(req.headers);
  if (!requireAuthorisingOfficer(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rawBody: unknown = await req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const to = parsed.data.to?.trim() || user.email.trim() || getAdminPanelEmail();
  const tenantId = user.tenantId;
  const cfg = await loadNotificationConfigForTenant(prismaBase, tenantId);

  if (!cfg.emailEnabled) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Kiracıda e-posta bildirimi kapalı — önce bildirim ayarlarından etkinleştirin.",
      },
      { status: 400 }
    );
  }

  if (!isSmtpConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        error: "SMTP yapılandırılmadı — SMTP_URL veya SMTP_HOST kurun.",
      },
      { status: 400 }
    );
  }

  const baseUrlRaw = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const baseUrl = baseUrlRaw.replace(/\/$/, "");

  let subject: string;
  let text: string;
  let html: string | undefined;

  if (parsed.data.htmlPreviewVariant) {
    const variant = parsed.data.htmlPreviewVariant;
    const sample = buildSampleExpiryReminderInput(baseUrl, variant);
    subject =
      `[SponsorTrack] Görsel hatırlatma örneği (${variant}) · HTML expiry reminder preview`;
    text = [
      buildExpiryReminderPlainTextFallback(sample),
      "",
      "---",
      "Bu mesaj bildirim HTML şablonunun demodur.",
      `This demo uses variant “${variant}”.`,
    ].join("\n");
    html = buildExpiryReminderEmailHtml(sample);
  } else {
    subject = "[SponsorTrack] Bildirimler test • Notifications test";
    text = [
      "Bu e-posta, Ayarlar › Bildirimler bölümündeki yapılandırmayı doğrular.",
      "",
      "CC/BCC adresleri bildirim ayarlarındaki liste ile uyumlu denemeler için SMTP üzerinden iletilir.",
      "",
      "---",
      "This message verifies notification settings routing from SponsorTrack.",
      "Hatırlatma şablonunu görmek için isteğe `htmlPreviewVariant` gönderin (visa | cos | sponsorship | rtw | document).",
      "Send `htmlPreviewVariant` to preview the expiry reminder HTML design.",
    ].join("\n");
  }

  const result = await sendSmtpMailDetailed({
    to,
    cc: joinSmtpRecipients(cfg.ccRecipients),
    bcc: joinSmtpRecipients(cfg.bccRecipients),
    subject,
    text,
    html,
  });

  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: result.reason,
        code: result.code,
        responseCode: result.responseCode,
      },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true, to });
}
