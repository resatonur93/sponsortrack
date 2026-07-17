import { prismaBase } from "@/lib/prisma";
import { LoginAttemptScope } from "@prisma/client";

const MAX_FAILURES_PER_EMAIL = 5;
const MAX_FAILURES_PER_IP = 20;
const WINDOW_MS = 15 * 60 * 1000;
const STALE_ROW_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export async function isLoginRateLimited(params: {
  email: string;
  ip: string;
  scope: LoginAttemptScope;
}): Promise<boolean> {
  const since = new Date(Date.now() - WINDOW_MS);
  const [byEmail, byIp] = await Promise.all([
    prismaBase.loginAttempt.count({
      where: { email: params.email, scope: params.scope, createdAt: { gte: since } },
    }),
    prismaBase.loginAttempt.count({
      where: { ip: params.ip, scope: params.scope, createdAt: { gte: since } },
    }),
  ]);
  return byEmail >= MAX_FAILURES_PER_EMAIL || byIp >= MAX_FAILURES_PER_IP;
}

/** Fire-and-forget-safe: caller should await but a failure here must never block the login response. */
export async function recordLoginFailure(params: {
  email: string;
  ip: string;
  scope: LoginAttemptScope;
}): Promise<void> {
  await prismaBase.loginAttempt.create({ data: params });
  if (Math.random() < 0.01) {
    await prismaBase.loginAttempt
      .deleteMany({ where: { createdAt: { lt: new Date(Date.now() - STALE_ROW_MAX_AGE_MS) } } })
      .catch(() => {});
  }
}

export { LoginAttemptScope };
