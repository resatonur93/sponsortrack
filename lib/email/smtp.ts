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

export type SendSmtpMailResult =
  | { ok: true }
  | { ok: false; reason: string; code?: string; responseCode?: number };

function unwrapSmtpError(e: unknown): {
  message: string;
  code?: string;
  responseCode?: number;
} {
  if (e && typeof e === "object") {
    const o = e as Record<string, unknown>;
    const message =
      typeof o.message === "string" ? o.message : String(o);
    const code =
      typeof o.code === "string"
        ? o.code
        : typeof o.errno !== "undefined"
          ? String(o.errno)
          : undefined;
    const responseCode =
      typeof o.responseCode === "number" ? o.responseCode : undefined;
    return { message, code, responseCode };
  }
  return { message: String(e) };
}

const TRANSIENT_SMTP_CODES = new Set([
  "ECONNREFUSED", "ETIMEDOUT", "ECONNRESET", "EHOSTUNREACH", "ENETUNREACH",
]);

function isTransientSmtpError(result: Extract<SendSmtpMailResult, { ok: false }>): boolean {
  if (result.code && TRANSIENT_SMTP_CODES.has(result.code)) return true;
  const rc = result.responseCode;
  return rc === 421 || rc === 451 || rc === 452;
}

/** Başarısızlıkta auth / bağlantı / kota gibi nedeni ile birlikte döner. Geçici hatalar 3 denemeye kadar yeniden denenir. */
export async function sendSmtpMailDetailed(input: {
  to: string;
  subject: string;
  text: string;
  html?: string;
  cc?: string;
  bcc?: string;
}): Promise<SendSmtpMailResult> {
  const transport = getTransport();
  if (!transport) {
    const reason =
      "SMTP not configured — set SMTP_URL or SMTP_HOST (+ SMTP_PORT, SMTP_USER/PASS)";
    logger.warn("sendSmtpMailDetailed: no transport", { to: input.to });
    return { ok: false, reason };
  }
  const from =
    process.env.SMTP_FROM?.trim() ?? "info@sponsortrack.co.uk";

  const MAX_ATTEMPTS = 3;
  const BASE_DELAY_MS = 1_000;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      await transport.sendMail({
        from,
        to: input.to,
        cc: input.cc?.trim() || undefined,
        bcc: input.bcc?.trim() || undefined,
        subject: input.subject,
        text: input.text,
        html: input.html,
      });
      logger.info("sendSmtpMailDetailed: delivered", {
        to: input.to,
        subject: input.subject.slice(0, 80),
        attempt,
      });
      return { ok: true };
    } catch (e) {
      const u = unwrapSmtpError(e);
      const result: Extract<SendSmtpMailResult, { ok: false }> = {
        ok: false,
        reason: u.message,
        code: u.code,
        responseCode: u.responseCode,
      };

      if (!isTransientSmtpError(result) || attempt === MAX_ATTEMPTS) {
        logger.error("sendSmtpMailDetailed failed", e, {
          to: input.to,
          attempt,
          ...u,
        });
        return result;
      }

      const delayMs = BASE_DELAY_MS * Math.pow(2, attempt - 1);
      logger.warn("sendSmtpMailDetailed transient error, retrying", {
        to: input.to,
        attempt,
        delayMs,
        ...u,
      });
      await new Promise<void>((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return { ok: false, reason: "Max retries exceeded" };
}

export async function sendSmtpMail(input: {
  to: string;
  subject: string;
  text: string;
  html?: string;
  cc?: string;
  bcc?: string;
}): Promise<boolean> {
  const r = await sendSmtpMailDetailed(input);
  return r.ok;
}
