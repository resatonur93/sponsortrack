/**
 * Tek seferlik SMTP test maili — .env ile aynı ayarları kullanır.
 *
 *   npx tsx scripts/send-test-smtp.ts
 *   npx tsx scripts/send-test-smtp.ts alerts@example.com
 */
import { config } from "dotenv";
import { resolve } from "path";
import { getAdminPanelEmail } from "@/lib/admin-panel-access";
import {
  isSmtpConfigured,
  sendSmtpMailDetailed,
} from "@/lib/email/smtp";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

const argTo = process.argv[2]?.trim();
const fromEnv =
  process.env.SMTP_TEST_TO?.trim() ?? (argTo && argTo.length > 0 ? argTo : null);
const to = fromEnv ?? getAdminPanelEmail();

const BODY =
  "Bu bir test mailidir. SponsorTrack bildirim sistemi çalışıyor.\nThis is a test email. SponsorTrack notification system is operational.";

async function main(): Promise<void> {
  console.log(`SMTP configured: ${isSmtpConfigured()}`);
  console.log(`Recipient: ${to}`);
  if (!isSmtpConfigured()) {
    console.error(
      "[send-test-smtp] Ayarlı değil: SMTP_URL veya SMTP_HOST + SMTP_PORT"
    );
    process.exit(2);
    return;
  }
  const r = await sendSmtpMailDetailed({
    to,
    subject: "[SponsorTrack] SMTP CLI test",
    text: BODY,
  });
  if (r.ok) {
    console.log("[send-test-smtp] OK — gönderildi.");
  } else {
    console.error(
      `[send-test-smtp] HATA — ${r.reason}${r.code ? ` (code: ${r.code})` : ""}${r.responseCode != null ? ` responseCode: ${r.responseCode}` : ""}`
    );
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
