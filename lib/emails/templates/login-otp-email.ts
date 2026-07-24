import { escapeHtml } from "@/lib/emails/templates/expiry-reminder-template";

export type LoginOtpEmailLocale = "tr" | "en";

const COPY: Record<
  LoginOtpEmailLocale,
  {
    subject: string;
    heading: string;
    intro: string;
    expiryNote: (minutes: number) => string;
    ignoreNote: string;
  }
> = {
  tr: {
    subject: "SponsorTrack giriş kodunuz",
    heading: "Giriş doğrulama kodu",
    intro: "SponsorTrack'e giriş yapmak için aşağıdaki kodu kullanın:",
    expiryNote: (minutes) => `Bu kod ${minutes} dakika içinde geçerliliğini yitirir.`,
    ignoreNote: "Bu girişi siz talep etmediyseniz bu e-postayı yok sayabilirsiniz.",
  },
  en: {
    subject: "Your SponsorTrack sign-in code",
    heading: "Sign-in verification code",
    intro: "Use the code below to sign in to SponsorTrack:",
    expiryNote: (minutes) => `This code expires in ${minutes} minutes.`,
    ignoreNote: "If you didn't request this sign-in, you can safely ignore this email.",
  },
};

export function buildLoginOtpEmail(params: {
  code: string;
  locale: LoginOtpEmailLocale;
  expiryMinutes: number;
}): { subject: string; text: string; html: string } {
  const copy = COPY[params.locale] ?? COPY.tr;
  const expiryLine = copy.expiryNote(params.expiryMinutes);
  const code = params.code;

  const text = [copy.intro, "", code, "", expiryLine, "", copy.ignoreNote].join("\n");

  const html = `
    <div style="font-family: -apple-system, 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; color: #16202c;">
      <p style="font-size: 13px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #a9824f; margin: 0 0 12px;">SponsorTrack</p>
      <h1 style="font-size: 20px; margin: 0 0 16px; color: #0A2A5E;">${escapeHtml(copy.heading)}</h1>
      <p style="font-size: 14.5px; line-height: 1.6; margin: 0 0 20px; color: #444;">${escapeHtml(copy.intro)}</p>
      <div style="font-size: 34px; font-weight: 700; letter-spacing: 0.2em; color: #0A2A5E; background: #F8F9FA; border: 1px solid #e2e6ea; border-radius: 10px; padding: 16px 20px; text-align: center; margin: 0 0 20px;">${escapeHtml(code)}</div>
      <p style="font-size: 13px; color: #56626f; margin: 0 0 8px;">${escapeHtml(expiryLine)}</p>
      <p style="font-size: 13px; color: #56626f; margin: 0;">${escapeHtml(copy.ignoreNote)}</p>
    </div>
  `.trim();

  return { subject: copy.subject, text, html };
}
