import { createHash } from "node:crypto";

export function uaFingerprint(userAgent: string | null | undefined): string {
  const raw = typeof userAgent === "string" && userAgent.trim() ? userAgent : "unknown";
  return createHash("sha256").update(raw).digest("hex");
}

/** Kısa, okunabilir cihaz adı (otomatik öneri — admin tarafından değiştirilebilir). */
export function deviceLabelFromUserAgent(userAgent: string | null | undefined): string {
  const ua = userAgent ?? "";
  if (!ua.trim()) return "Unknown browser";
  if (/Edg\//i.test(ua)) return "Microsoft Edge";
  if (/Firefox\//i.test(ua)) return "Firefox";
  if (/Chrome\//i.test(ua)) return "Chrome";
  if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) return "Safari";
  return ua.length > 80 ? `${ua.slice(0, 77)}…` : ua;
}
