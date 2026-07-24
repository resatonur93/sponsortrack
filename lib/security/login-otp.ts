import { randomInt } from "node:crypto";
import bcrypt from "bcryptjs";
import { prismaBase } from "@/lib/prisma";

export const OTP_CODE_LENGTH = 6;
export const OTP_EXPIRY_MS = 10 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_COOLDOWN_MS = 45 * 1000;
export const OTP_MAX_REQUESTS_PER_HOUR = 8;
const STALE_ROW_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const BCRYPT_COST = 12;

export function generateOtpCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(OTP_CODE_LENGTH, "0");
}

export type IssueOtpChallengeResult =
  | { ok: true; challengeId: string; code: string; expiresAt: Date }
  | { ok: false; reason: "COOLDOWN"; retryAfterSeconds: number }
  | { ok: false; reason: "RATE_LIMITED" };

export async function issueOtpChallenge(params: {
  userId: string;
  tenantId: string;
  ip: string;
}): Promise<IssueOtpChallengeResult> {
  const now = new Date();

  const lastActive = await prismaBase.loginOtpChallenge.findFirst({
    where: { userId: params.userId, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (lastActive) {
    const elapsedMs = now.getTime() - lastActive.createdAt.getTime();
    if (elapsedMs < OTP_RESEND_COOLDOWN_MS) {
      return {
        ok: false,
        reason: "COOLDOWN",
        retryAfterSeconds: Math.ceil((OTP_RESEND_COOLDOWN_MS - elapsedMs) / 1000),
      };
    }
  }

  const since = new Date(now.getTime() - 60 * 60 * 1000);
  const requestsInLastHour = await prismaBase.loginOtpChallenge.count({
    where: { userId: params.userId, createdAt: { gte: since } },
  });
  if (requestsInLastHour >= OTP_MAX_REQUESTS_PER_HOUR) {
    return { ok: false, reason: "RATE_LIMITED" };
  }

  const code = generateOtpCode();
  const codeHash = await bcrypt.hash(code, BCRYPT_COST);
  const expiresAt = new Date(now.getTime() + OTP_EXPIRY_MS);

  await prismaBase.loginOtpChallenge.updateMany({
    where: { userId: params.userId, consumedAt: null },
    data: { consumedAt: now },
  });

  const challenge = await prismaBase.loginOtpChallenge.create({
    data: {
      tenantId: params.tenantId,
      userId: params.userId,
      codeHash,
      ip: params.ip,
      expiresAt,
    },
  });

  if (Math.random() < 0.01) {
    void prismaBase.loginOtpChallenge
      .deleteMany({ where: { createdAt: { lt: new Date(now.getTime() - STALE_ROW_MAX_AGE_MS) } } })
      .catch(() => {});
  }

  return { ok: true, challengeId: challenge.id, code, expiresAt };
}

export type OtpVerifyResult =
  | { ok: true }
  | { ok: false; reason: "NOT_FOUND" | "EXPIRED" | "CONSUMED" | "LOCKED" | "INVALID_CODE" };

export async function verifyOtpChallenge(params: {
  challengeId: string;
  userId: string;
  code: string;
}): Promise<OtpVerifyResult> {
  const challenge = await prismaBase.loginOtpChallenge.findFirst({
    where: { id: params.challengeId, userId: params.userId },
  });
  if (!challenge) return { ok: false, reason: "NOT_FOUND" };
  if (challenge.consumedAt) return { ok: false, reason: "CONSUMED" };
  if (challenge.expiresAt.getTime() <= Date.now()) {
    await prismaBase.loginOtpChallenge.update({
      where: { id: challenge.id },
      data: { consumedAt: new Date() },
    });
    return { ok: false, reason: "EXPIRED" };
  }
  if (challenge.attemptCount >= challenge.maxAttempts) {
    await prismaBase.loginOtpChallenge.update({
      where: { id: challenge.id },
      data: { consumedAt: new Date() },
    });
    return { ok: false, reason: "LOCKED" };
  }

  const matches = await bcrypt.compare(params.code, challenge.codeHash);
  if (!matches) {
    const nextAttemptCount = challenge.attemptCount + 1;
    const lockedOut = nextAttemptCount >= challenge.maxAttempts;
    await prismaBase.loginOtpChallenge.update({
      where: { id: challenge.id },
      data: {
        attemptCount: nextAttemptCount,
        consumedAt: lockedOut ? new Date() : undefined,
      },
    });
    return { ok: false, reason: lockedOut ? "LOCKED" : "INVALID_CODE" };
  }

  await prismaBase.loginOtpChallenge.update({
    where: { id: challenge.id },
    data: { consumedAt: new Date() },
  });
  return { ok: true };
}
