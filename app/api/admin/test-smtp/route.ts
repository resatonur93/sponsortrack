import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/api-context";
import { logger } from "@/lib/logger";
import { requireAuthorisingOfficer } from "@/lib/admin-auth";
import { getAdminPanelEmail } from "@/lib/admin-panel-access";
import { isSmtpConfigured, sendSmtpMailDetailed } from "@/lib/email/smtp";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  to: z.string().email().optional(),
});

const TEST_SUBJECT = "SponsorTrack — SMTP test";
const TEST_TEXT =
  "Bu bir test mailidir. SponsorTrack bildirim sistemi çalışıyor. / This is a test email. SponsorTrack notification system is operational.";

/** Varsayılan alıcı: SMTP_TEST_TO > ADMIN_PANEL ile aynı allowlist adresi */
function defaultTestRecipient(): string {
  const fromEnv = process.env.SMTP_TEST_TO?.trim();
  if (fromEnv && z.string().email().safeParse(fromEnv).success) {
    return fromEnv;
  }
  return getAdminPanelEmail();
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const user = await getSessionUser();
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

    const to = parsed.data.to?.trim() || defaultTestRecipient();

    logger.info("admin.test-smtp requested", {
      requestedBy: user.email,
      to,
      smtpHostSet: Boolean(process.env.SMTP_HOST?.trim() || process.env.SMTP_URL?.trim()),
    });

    if (!isSmtpConfigured()) {
      logger.warn("admin.test-smtp: SMTP not configured");
      return NextResponse.json(
        {
          ok: false,
          error:
            "SMTP yapılandırılmadı — SMTP_URL veya SMTP_HOST (+ SMTP_PORT) ayarlayın.",
        },
        { status: 400 }
      );
    }

    const result = await sendSmtpMailDetailed({
      to,
      subject: TEST_SUBJECT,
      text: TEST_TEXT,
      html: `<p>${TEST_TEXT.replace(/\.\s/g, ".<br/>")}</p>`,
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
  } catch (e) {
    logger.error("POST /api/admin/test-smtp failed", e);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
