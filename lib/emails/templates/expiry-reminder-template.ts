import type {
  DocumentExpiryReminderKind,
  NotificationComplianceAnchorDomain,
} from "@prisma/client";

export type ExpiryReminderVisualVariant =
  | "visa"
  | "cos"
  | "sponsorship"
  | "rtw"
  | "document";

/** Uyumluluk anket alanları → görsel tema. */
export function expiryVariantFromAnchorDomain(domain: string): ExpiryReminderVisualVariant {
  switch (domain) {
    case "VISA_EXPIRY":
      return "visa";
    case "COS_EXPIRY":
      return "cos";
    case "SPONSORSHIP_END":
      return "sponsorship";
    case "RIGHT_TO_WORK_RECHECK":
      return "rtw";
    default:
      return "visa";
  }
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function theme(variant: ExpiryReminderVisualVariant): {
  primary: string;
  accent: string;
  lightBg: string;
  barTrack: string;
  icon: string;
  tagTr: string;
  tagEn: string;
} {
  switch (variant) {
    case "visa":
      return {
        primary: "#0A2A5E",
        accent: "#2563EB",
        lightBg: "#EFF6FF",
        barTrack: "#BFDBFE",
        icon: "✈️",
        tagTr: "Vize uyumluluğu · Visa validity",
        tagEn: "Visa sponsorship compliance",
      };
    case "cos":
      return {
        primary: "#9A3412",
        accent: "#EA580C",
        lightBg: "#FFF7ED",
        barTrack: "#FDBA74",
        icon: "📋",
        tagTr: "CoS · Certificate of Sponsorship",
        tagEn: "CoS expiry horizon",
      };
    case "sponsorship":
      return {
        primary: "#065F46",
        accent: "#059669",
        lightBg: "#ECFDF5",
        barTrack: "#A7F3D0",
        icon: "💼",
        tagTr: "Sponsorluk kapsaması · Sponsorship",
        tagEn: "Sponsorship coverage end",
      };
    case "rtw":
      return {
        primary: "#5B21B6",
        accent: "#7C3AED",
        lightBg: "#F5F3FF",
        barTrack: "#DDD6FE",
        icon: "👆",
        tagTr: "Right to Work · çalışma hakkı",
        tagEn: "Right-to-work recheck",
      };
    case "document":
      return {
        primary: "#92400E",
        accent: "#D97706",
        lightBg: "#FFFBEB",
        barTrack: "#FDE68A",
        icon: "📄",
        tagTr: "Belge uyumu · Document",
        tagEn: "Document expiry",
      };
  }
}

/** Kalan güne göre bar doluluk: süre yaklaştıkça % yükselir. */
export function urgencyProgressPct(daysRemaining: number): number {
  if (!Number.isFinite(daysRemaining)) return 55;
  if (daysRemaining < 0) return 100;
  if (daysRemaining === 0) return 96;
  const cap = 60;
  const x = Math.min(cap, Math.max(0, daysRemaining));
  return Math.round(100 - (x / cap) * 82);
}

function builtInHeadlines(args: {
  variant: ExpiryReminderVisualVariant;
  kind: DocumentExpiryReminderKind;
  tierAdvanceDays?: number;
}): { titleTr: string; titleEn: string } {
  const { variant, kind, tierAdvanceDays } = args;

  const topicTr: Record<ExpiryReminderVisualVariant, string> = {
    visa: "Vize süresi",
    cos: "CoS süresi",
    sponsorship: "Sponsorluk süresinin bitişi",
    rtw: "Right to Work yeniden kontrol",
    document: "Belge süresi",
  };
  const topicEn: Record<ExpiryReminderVisualVariant, string> = {
    visa: "Visa validity",
    cos: "CoS validity",
    sponsorship: "Sponsorship end date",
    rtw: "Right to Work recheck",
    document: "Document expiry",
  };

  const tTr = topicTr[variant];
  const tEn = topicEn[variant];

  switch (kind) {
    case "BEFORE_60":
    case "BEFORE_30":
    case "BEFORE_7":
      return {
        titleTr: `Hatırlatma · ${tTr}`,
        titleEn:
          tierAdvanceDays != null && tierAdvanceDays > 0
            ? `Reminder · ${tierAdvanceDays} day(s) to ${tEn}`
            : `Reminder · approaching ${tEn}`,
      };
    case "EXPIRY_DAY":
      return { titleTr: `Bugün kritik tarih · ${tTr}`, titleEn: `Today · ${tEn}` };
    case "AFTER_EXPIRED":
      return { titleTr: `Geciken aksiyon · ${tTr}`, titleEn: `Overdue · ${tEn}` };
    default:
      return { titleTr: tTr, titleEn: tEn };
  }
}

function remainingLabelTr(daysRemaining: number): string {
  if (daysRemaining < 0) return `Süresi doldu (${Math.abs(daysRemaining)} gün)`;
  if (daysRemaining === 0) return "Bugün";
  return `${daysRemaining} gün kaldı`;
}

function remainingLabelEn(daysRemaining: number): string {
  if (daysRemaining < 0) return `Expired (${Math.abs(daysRemaining)} day(s))`;
  if (daysRemaining === 0) return "Today";
  return `${daysRemaining} day(s) left`;
}

export type ExpiryReminderTemplateInput = {
  baseUrl: string;
  variant: ExpiryReminderVisualVariant;
  reminderKind: DocumentExpiryReminderKind;
  /** Takvim güne göre kalan süre (`daysBetween(todayUtc, expiryUtcAnchor)` pozitif = gelecekte). */
  daysRemaining: number;
  expiryDateISO: string;
  workerName: string;
  workerId: string;
  companyName: string;
  cosReference: string;
  /** DB şablonlarından özelleştirilirse geçilir; boş ise yerleşik başlıklar. */
  customTitleTr?: string;
  customTitleEn?: string;
  tierAdvanceDays?: number;
  documentLabelTr?: string;
  documentLabelEn?: string;
  fileName?: string;

  /** Birincil CTA (SMTP / ayar doğrulama testi için `admin/settings` vb.). */
  ctaOverride?: { href: string; labelTr: string; labelEn: string };

  /** Gelen kutusu özet satırı (gizli preheader); boş ise otomatik. */
  preHeaderOverride?: string;

  /** Sarı uyarı şeridi (deneme bildirumu vb.). */
  eyebrowRibbonTr?: string;
  eyebrowRibbonEn?: string;

  /** Varsayılan: "Çalışan / Worker" */
  detailPrimaryLineLabel?: string;

  /** Altbilgide ileti öncesi ek paragraf. */
  footerNoticeSupplementTr?: string;
  footerNoticeSupplementEn?: string;
};

/**
 * Mobil uyumlu, tablolu yapı · inline CSS. TR ve EN bloklar alt alta yer alır.
 * Logo için mutlak HTTPS taban adresi gereklidir.
 */
export function buildExpiryReminderEmailHtml(input: ExpiryReminderTemplateInput): string {
  const th = theme(input.variant);
  const fill = urgencyProgressPct(input.daysRemaining);
  const built = builtInHeadlines({
    variant: input.variant,
    kind: input.reminderKind,
    tierAdvanceDays: input.tierAdvanceDays,
  });
  const titleTr = escapeHtml(input.customTitleTr ?? built.titleTr);
  const titleEn = escapeHtml(input.customTitleEn ?? built.titleEn);
  const worker = escapeHtml(input.workerName);
  const company = escapeHtml(input.companyName);
  const cos = escapeHtml(input.cosReference);
  const dateIso = escapeHtml(input.expiryDateISO);
  const remTr = escapeHtml(remainingLabelTr(input.daysRemaining));
  const remEn = escapeHtml(remainingLabelEn(input.daysRemaining));

  const base = input.baseUrl.replace(/\/$/, "");
  const logoUrl = `${base}/brand/logo-primary.svg`;
  const defaultCtaHref = `${base}/workers/${encodeURIComponent(input.workerId)}/documents`;
  const primaryCta = input.ctaOverride ?? {
    href: defaultCtaHref,
    labelTr: "Belge Kasasını Aç",
    labelEn: "Open document vault",
  };
  const ctaUrl = escapeHtml(primaryCta.href);
  const ctaLabelTrEsc = escapeHtml(primaryCta.labelTr);
  const ctaLabelEnEsc = escapeHtml(primaryCta.labelEn);
  const detailPersonLbl = escapeHtml(
    input.detailPrimaryLineLabel ?? "Çalışan / Worker"
  );
  const rawSupport =
    process.env.SUPPORT_CONTACT_EMAIL?.trim() ||
    process.env.SMTP_FROM?.trim() ||
    "info@sponsortrack.co.uk";
  const support = escapeHtml(rawSupport);

  const docBlockHtml =
    input.variant === "document" && input.documentLabelTr?.trim()
      ? `<strong style="color:${th.primary};">Belge türü / Document type:</strong><br/>
          ${escapeHtml(input.documentLabelTr)} / ${escapeHtml(input.documentLabelEn ?? input.documentLabelTr)}
          ${input.fileName?.trim() ? `<br/><strong>Dosya / File:</strong> ${escapeHtml(input.fileName)}` : ""}`
      : "";

  const preHeaderRaw =
    input.preHeaderOverride?.trim() ??
    `[SponsorTrack] ${remainingLabelEn(input.daysRemaining)} — ${worker} — UTC ${input.expiryDateISO}`;
  const preHeader = escapeHtml(preHeaderRaw);

  const ribbonTr = input.eyebrowRibbonTr?.trim();
  const ribbonEn = input.eyebrowRibbonEn?.trim();
  const ribbonInner =
    ribbonTr && ribbonEn
      ? `${escapeHtml(ribbonTr)}<span style="display:block;margin-top:4px;color:#78350F;font-weight:600;">🇬🇧 ${escapeHtml(
          ribbonEn
        )}</span>`
      : ribbonTr
        ? escapeHtml(ribbonTr)
        : ribbonEn
          ? `🇬🇧 ${escapeHtml(ribbonEn)}`
          : "";
  const ribbonBlock = ribbonInner
    ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:14px;border-collapse:collapse;">
          <tr>
            <td style="padding:10px 14px;background:#FFFBEB;border-radius:10px;border:1px solid #FCD34D;font-size:12px;line-height:1.45;color:#92400E;font-weight:600;text-align:center;">
              ${ribbonInner}
            </td>
          </tr>
        </table>`
    : "";

  const footerSupplement =
    input.footerNoticeSupplementTr?.trim() || input.footerNoticeSupplementEn?.trim()
      ? `<p style="margin:0 0 12px;">${escapeHtml(input.footerNoticeSupplementTr?.trim() ?? "")}${
          input.footerNoticeSupplementEn?.trim()
            ? `<br/><span style="color:#475569;font-size:11px;display:block;margin-top:4px;">🇬🇧 ${escapeHtml(
                input.footerNoticeSupplementEn.trim()
              )}</span>`
            : ""
        }</p>`
      : "";

  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>SponsorTrack</title>
  <style type="text/css">
    @media only screen and (max-width: 620px) {
      .stk-wrap { padding:16px!important; }
      .stk-card { padding:20px!important; }
      .stk-h1 { font-size:20px!important; line-height:1.25!important; }
      .stk-num { font-size:36px!important; }
      .stk-cta-wrap { padding: 0 16px!important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:Segoe UI,system-ui,-apple-system,BlinkMacSystemFont,sans-serif;color:#1E293B;">
  <!-- preheader -->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${preHeader}</div>

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background:#F1F5F9;">
    <tr>
      <td class="stk-wrap" style="padding:28px 12px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" align="center"
          style="max-width:600px;margin:0 auto;background:#FFFFFF;border-collapse:collapse;border-radius:16px;
          overflow:hidden;box-shadow:0 14px 40px rgba(10,42,94,0.10);">

          <!-- Logo strip -->
          <tr>
            <td style="padding:24px 28px 8px;text-align:center;border-bottom:1px solid #E2E8F0;">
              <!--[if mso]>
              <table role="presentation" width="100%"><tr><td align="center" style="padding:0 8px;">
              <p style="margin:0;font-size:22px;font-weight:bold;color:${th.primary};">Sponsor<span style="color:#D4AF87;">Track</span></p>
              </td></tr></table>
              <![endif]-->
              <!--[if !mso]><!-->
              <img src="${escapeHtml(logoUrl)}" width="180" height="36" alt="SponsorTrack" style="display:block;margin:0 auto;height:auto;border:0;outline:none;text-decoration:none;max-width:180px;"/>
              <!--<![endif]-->
            </td>
          </tr>

          <!-- Hero -->
          <tr>
            <td class="stk-card" style="padding:24px 28px 12px;background:linear-gradient(180deg,${th.lightBg} 0%,#FFFFFF 100%);">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
                <tr>
                  <td style="vertical-align:middle;width:56px;font-size:40px;line-height:1;">${th.icon}</td>
                  <td style="vertical-align:middle;">
                    <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:0.08em;color:${th.primary};opacity:0.85;">
                      SPONSORTRACK · UYUMLULUK / COMPLIANCE
                    </p>
                    <h1 class="stk-h1" style="margin:0;font-size:22px;line-height:1.3;color:${th.primary};font-weight:800;">
                      ${titleTr}
                    </h1>
                  </td>
                </tr>
              </table>
              <p style="margin:10px 0 0;font-size:13px;line-height:1.45;color:#64748B;">
                🇬🇧 <span style="color:#334155;">${titleEn}</span>
              </p>
              ${ribbonBlock}
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin-top:14px;border-collapse:collapse;">
                <tr>
                  <td style="padding:8px 12px;background:${th.lightBg};border-radius:999px;font-size:12px;font-weight:600;color:${th.primary};">
                    ${escapeHtml(th.tagTr)} · <span style="font-weight:500;color:#475569;">${escapeHtml(th.tagEn)}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Date highlight -->
          <tr>
            <td style="padding:0 28px 18px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
                style="border-collapse:collapse;border-radius:14px;background:${th.primary};overflow:hidden;color:#FFFFFF;">
                <tr>
                  <td style="padding:20px 22px;">
                    <p style="margin:0;font-size:12px;opacity:0.88;font-weight:600;letter-spacing:0.04em;">
                      KALAN SÜRE / TIME REMAINING · UTC takvimi · UTC calendar day
                    </p>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:10px;border-collapse:collapse;">
                      <tr>
                        <td class="stk-num" valign="middle" width="52%" style="font-size:44px;line-height:1;font-weight:800;letter-spacing:-0.03em;color:#FFFFFF;">
                          ${escapeHtml(remTr)}
                          <span style="display:block;font-size:13px;margin-top:6px;font-weight:600;color:#E2E8F0;line-height:1.35;">
                            🇬🇧 ${remEn}
                          </span>
                        </td>
                        <td valign="middle" style="padding-left:14px;text-align:right;">
                          <span style="display:inline-block;text-align:right;padding:12px 16px;background:rgba(255,255,255,0.12);border-radius:12px;font-size:15px;line-height:1.35;color:#FFFFFF;">
                            <small style="display:block;font-size:11px;opacity:0.85;text-transform:uppercase;letter-spacing:0.06em;">Bitiş / Expiry</small>
                            <strong style="font-size:21px;line-height:1.2;display:block;margin-top:2px;color:#FFFFFF;">${dateIso}</strong>
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Progress -->
          <tr>
            <td style="padding:0 28px 16px;">
              <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:${th.primary};">
                Süre yakınsaması · Priority meter
              </p>
              <div style="height:14px;border-radius:999px;background:${th.barTrack};overflow:hidden;">
                <div style="height:14px;width:${fill}%;max-width:100%;background:${th.accent};border-radius:999px;line-height:0;font-size:0;">
                  &#160;
                </div>
              </div>
              <p style="margin:10px 0 0;font-size:12px;color:#64748B;line-height:1.45;">
                ${fill}% — son tarihe yakınlık görsel özeti<br/>
                Visual urgency summary towards the expiry anchor (UTC midnight comparison).
              </p>
            </td>
          </tr>

          <!-- Details -->
          <tr>
            <td style="padding:0 28px 22px;color:#475569;font-size:14px;line-height:1.6;">
              <strong style="color:${th.primary};">${detailPersonLbl}</strong>: ${worker}<br/>
              <strong style="color:${th.primary};">Kuruluş / Organisation</strong>: ${company}<br/>
              <strong style="color:${th.primary};">CoS referansı / CoS reference</strong>: ${cos}<br/>
              ${docBlockHtml ? `${docBlockHtml}<br/>` : ""}
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td class="stk-cta-wrap" style="padding:0 28px 28px;text-align:center;">
              <table role="presentation" cellspacing="0" cellpadding="0" align="center"
                style="border-collapse:separate;mso-hide:all;border-radius:999px;background:${th.accent};">
                <tr>
                  <td style="border-radius:999px;mso-hide:all;">
                    <a href="${ctaUrl}"
                       style="display:inline-block;padding:16px 32px;color:#FFFFFF;font-size:15px;font-weight:800;text-decoration:none;letter-spacing:0.03em;line-height:1.3;">
                      ${ctaLabelTrEsc}<br/>
                      <span style="font-size:12px;font-weight:600;opacity:0.93;">${ctaLabelEnEsc}</span>
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:14px 0 0;font-size:12px;color:#94A3B8;word-break:break-all;">
                ${escapeHtml(ctaUrl)}
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:16px 28px 26px;background:#F8FAFC;border-top:1px solid #E2E8F0;font-size:12px;line-height:1.55;color:#64748B;">
              <strong style="color:#475569;">Bilgilendirme / Notice</strong><br/>
              ${footerSupplement}
              Bu mesaj SponsorTrack gözetim bildirimi sisteminden otomatik gönderilir. Acil uyum koordinasyonunu AO ve uyum takımınız sürdürmelidir.<br/><br/>
              This message was sent automatically from SponsorTrack expiry monitoring. Maintain compliance escalation with your Authorising Officers and immigration team.<br/><br/>
              <strong>Yardım / Support:</strong>
              <a href="mailto:${support}" style="color:${th.accent};text-decoration:none;">${support}</a>
              &nbsp;·&nbsp; <strong>Bildiri merkezi / Inbox:</strong>
              <a href="${escapeHtml(`${base}/notifications`)}" style="color:${th.accent};text-decoration:none;">${escapeHtml(`${base}/notifications`)}</a>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Düz metin alternatif (çok kullanıcı dostu özeti). */
export function buildExpiryReminderPlainTextFallback(input: ExpiryReminderTemplateInput): string {
  const built = builtInHeadlines({
    variant: input.variant,
    kind: input.reminderKind,
    tierAdvanceDays: input.tierAdvanceDays,
  });
  const titleTr = input.customTitleTr ?? built.titleTr;
  const titleEn = input.customTitleEn ?? built.titleEn;
  const base = input.baseUrl.replace(/\/$/, "");
  const defaultCta = `${base}/workers/${encodeURIComponent(input.workerId)}/documents`;
  const cta = input.ctaOverride?.href ?? defaultCta;
  const lines = [
    `[SponsorTrack] ${titleTr} / ${titleEn}`,
    "",
    `${remainingLabelTr(input.daysRemaining)} / ${remainingLabelEn(input.daysRemaining)}`,
    `Bitiş tarihi · Expiry (UTC): ${input.expiryDateISO}`,
    "",
    input.documentLabelTr?.trim()
      ? `Belge türü · Document: ${input.documentLabelTr}${input.documentLabelEn ? ` / ${input.documentLabelEn}` : ""}`
      : "",
    input.fileName?.trim() ? `Dosya · File: ${input.fileName}` : "",
    "",
    `${input.detailPrimaryLineLabel ?? "Çalışan / Worker"}: ${input.workerName}`,
    `Şirket · Organisation: ${input.companyName}`,
    `CoS: ${input.cosReference}`,
    "",
    `Belge kasası · Vault: ${cta}`,
    `Bildirimler · Notifications: ${base}/notifications`,
  ].filter(Boolean);
  return lines.join("\n");
}

/** Ayarlar › Bildirimler “Test e-postası” — gerçek süre yok; SMTP + CC/BCC doğrulaması. */
export function buildSettingsConnectivityTestReminderInput(opts: {
  baseUrl: string;
  requestingUserDisplayName: string;
  tenantCompanyName: string;
}): ExpiryReminderTemplateInput {
  const base = opts.baseUrl.replace(/\/$/, "");
  const iso = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
  const name = opts.requestingUserDisplayName.trim();
  const comp = opts.tenantCompanyName.trim();
  return {
    baseUrl: opts.baseUrl,
    variant: "visa",
    reminderKind: "BEFORE_30",
    daysRemaining: 14,
    expiryDateISO: iso,
    workerName: name || "AO",
    workerId: "settings-connection-test",
    companyName: comp || "Organisation",
    cosReference: "— (SMTP ve bildirim testi)",
    customTitleTr: "Bildirim test mesajı",
    customTitleEn: "Notifications test message",
    tierAdvanceDays: 30,
    preHeaderOverride: `[SponsorTrack] Bildirim testi · ${comp || name || "tenant"}`,
    ctaOverride: {
      href: `${base}/admin/settings`,
      labelTr: "Bildirim ayarlarına dön",
      labelEn: "Open notification settings",
    },
    eyebrowRibbonTr: "Deneme — gerçek bir süre sonu bildirimi değildir",
    eyebrowRibbonEn: "Dry run — not a real expiry alert",
    detailPrimaryLineLabel: "Bu testi başlatan / Sent by",
    footerNoticeSupplementTr:
      "Bu gönderi yalnızca Ayarlar › Bildirimler ekranından tetiklenen bağlantı testidir. CC/BCC listeleriniz bu yolla SMTP üzerinden doğrulanır.",
    footerNoticeSupplementEn:
      "Sent from Settings › Notifications to verify SMTP and your CC/BCC distribution lists.",
  };
}

/** AO test e-postaları için tutarlı demoveriler. */
export function buildSampleExpiryReminderInput(
  baseUrl: string,
  variant: ExpiryReminderVisualVariant
): ExpiryReminderTemplateInput {
  return {
    baseUrl,
    variant,
    reminderKind: "BEFORE_7",
    daysRemaining: 7,
    expiryDateISO: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    workerName: "Demo Worker",
    workerId: "demo-worker-preview",
    companyName: "Demo Sponsor Organisation",
    cosReference: "COS-DEMO-000001",
    documentLabelTr: variant === "document" ? "Pasaport" : undefined,
    documentLabelEn: variant === "document" ? "Passport" : undefined,
    fileName: variant === "document" ? "passport-scan.pdf" : undefined,
    tierAdvanceDays: 7,
    customTitleTr: undefined,
    customTitleEn: undefined,
  };
}
