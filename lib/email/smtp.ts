import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { logger } from "@/lib/logger";

let cached: Transporter | null | undefined;

export function isSmtpConfigured(): boolean {
  return Boolean(
    process.env.SMTP_URL?.trim() || process.env.SMTP_HOST?.trim()
  );
}

function getTransport(): Transporter | null {
  if (cached !== undefined) {
    return cached;
  }
  const url = process.env.SMTP_URL?.trim();
  if (url) {
    cached = nodemailer.createTransport(url);
    return cached;
  }
  const host = process.env.SMTP_HOST?.trim();
  if (!host) {
    cached = null;
    return null;
  }
  const port = Number(process.env.SMTP_PORT ?? 587);
  // Hostinger SMTP 465 expects implicit TLS (secure=true). Port 587 + STARTTLS: set SMTP_SECURE=false.
  const secure = process.env.SMTP_SECURE === "true" || port === 465;
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS;
  cached = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user ? { user, pass: pass ?? "" } : undefined,
  });
  return cached;
}

export async function sendSmtpMail(input: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<boolean> {
  const transport = getTransport();
  if (!transport) {
    logger.warn("sendSmtpMail: SMTP not configured");
    return false;
  }
  const from =
    process.env.SMTP_FROM?.trim() ?? "info@sponsortrack.co.uk";
  try {
    await transport.sendMail({
      from,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });
    return true;
  } catch (e) {
    logger.error("sendSmtpMail failed", e, { to: input.to });
    return false;
  }
}
