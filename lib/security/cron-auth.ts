import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

/**
 * Timing-safe cron token doğrulama.
 * Bearer header veya ?token= query parametresinden token alınır.
 */
export function isCronRequestAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization");
  const token = header?.startsWith("Bearer ")
    ? header.slice(7)
    : req.nextUrl.searchParams.get("token");
  if (!token) return false;
  try {
    const a = Buffer.from(token);
    const b = Buffer.from(secret);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
