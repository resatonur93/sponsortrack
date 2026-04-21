import { createHmac, timingSafeEqual } from "node:crypto";

const COOKIE_NAME = "st_worker_portal";

export { COOKIE_NAME };

type Payload = { w: string; t: string; exp: number };

function secret(): string {
  return (
    process.env.WORKER_PORTAL_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "dev-worker-portal-secret-change-me"
  );
}

export function signWorkerPortalToken(
  workerId: string,
  tenantId: string,
  maxAgeSeconds: number
): string {
  const exp = Math.floor(Date.now() / 1000) + maxAgeSeconds;
  const payload: Payload = { w: workerId, t: tenantId, exp };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyWorkerPortalToken(
  token: string
): { workerId: string; tenantId: string } | null {
  const lastDot = token.lastIndexOf(".");
  if (lastDot <= 0) return null;
  const body = token.slice(0, lastDot);
  const sig = token.slice(lastDot + 1);
  const expected = createHmac("sha256", secret()).update(body).digest("base64url");
  try {
    const a = Buffer.from(sig, "utf8");
    const b = Buffer.from(expected, "utf8");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  let payload: Payload;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Payload;
  } catch {
    return null;
  }
  if (
    typeof payload.w !== "string" ||
    typeof payload.t !== "string" ||
    typeof payload.exp !== "number"
  ) {
    return null;
  }
  if (payload.exp < Math.floor(Date.now() / 1000)) return null;
  return { workerId: payload.w, tenantId: payload.t };
}
