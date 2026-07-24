import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { readClientIpFromHeaders } from "@/lib/security/ip-match";
import { verifyTenantCredentials } from "@/lib/security/verify-tenant-credentials";
import { issueOtpChallenge, OTP_EXPIRY_MS, OTP_RESEND_COOLDOWN_MS } from "@/lib/security/login-otp";
import { buildLoginOtpEmail } from "@/lib/emails/templates/login-otp-email";
import { sendSmtpMailDetailed } from "@/lib/email/smtp";

export const dynamic = "force-dynamic";

const requestSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
  locale: z.enum(["tr", "en"]).optional(),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body: unknown = await req.json();
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "validation_failed" }, { status: 400 });
    }
    const { email, password, locale } = parsed.data;

    let ip = "0.0.0.0";
    try {
      ip = readClientIpFromHeaders(await headers());
    } catch {
      logger.warn("request-otp: request headers unavailable for IP resolution");
    }

    const cred = await verifyTenantCredentials({ email, password, ip });
    if (!cred.ok) {
      return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
    }

    const challenge = await issueOtpChallenge({
      userId: cred.user.id,
      tenantId: cred.user.tenantId,
      ip,
    });
    if (!challenge.ok) {
      if (challenge.reason === "COOLDOWN") {
        return NextResponse.json(
          { error: "cooldown", retryAfterSeconds: challenge.retryAfterSeconds },
          { status: 429 }
        );
      }
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }

    const email_ = buildLoginOtpEmail({
      code: challenge.code,
      locale: locale ?? "tr",
      expiryMinutes: Math.round(OTP_EXPIRY_MS / 60000),
    });
    const sent = await sendSmtpMailDetailed({
      to: cred.user.email,
      subject: email_.subject,
      text: email_.text,
      html: email_.html,
    });
    if (!sent.ok) {
      logger.error("request-otp: email send failed", null, { reason: sent.reason });
      return NextResponse.json({ error: "email_failed" }, { status: 502 });
    }

    return NextResponse.json({
      data: {
        challengeId: challenge.challengeId,
        expiresInSeconds: Math.round(OTP_EXPIRY_MS / 1000),
        resendAvailableInSeconds: Math.round(OTP_RESEND_COOLDOWN_MS / 1000),
      },
    });
  } catch (error) {
    logger.error("POST /api/auth/request-otp failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
