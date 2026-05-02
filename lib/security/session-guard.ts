import { prismaBase } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { clientMatchesIpRule } from "@/lib/security/ip-match";
import { getOrCreateTenantSecurity } from "@/lib/security/tenant-login-ip";
import { Role } from "@prisma/client";
import type { AllowedIpRule } from "@prisma/client";

export const SESSION_TOUCH_GAP_MS = 120_000;

export type SessionGuardOutcome =
  | { ok: true }
  | {
      ok: false;
      reason:
        | "MISSING_SID"
        | "NOT_FOUND"
        | "REVOKED"
        | "IDLE"
        | "ABSOLUTE"
        | "IP_WHITELIST";
    };

type SessionFailReason = Extract<
  SessionGuardOutcome,
  { ok: false }
>["reason"];

export async function validateAndTouchAuthSession(params: {
  tenantId: string;
  userId: string;
  role?: Role;
  authSid?: string | null;
  resolvedClientIp: string;
}): Promise<SessionGuardOutcome> {
  const { authSid, tenantId, userId } = params;
  if (!authSid) {
    return { ok: false, reason: "MISSING_SID" };
  }

  const row = await prismaBase.userAuthSession.findUnique({
    where: { sessionToken: authSid },
  });

  const now = Date.now();

  const failNoRevoke = (reason: SessionFailReason): SessionGuardOutcome => {
    logger.info("session guard reject", { tenantId, userId, reason });
    return { ok: false, reason };
  };

  const failAndRevoke = async (
    reason: SessionFailReason,
    sessionRowId: string
  ): Promise<SessionGuardOutcome> => {
    logger.info("session guard reject", { tenantId, userId, reason });
    await prismaBase.userAuthSession.updateMany({
      where: { id: sessionRowId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { ok: false, reason };
  };

  if (!row || row.userId !== userId || row.tenantId !== tenantId) {
    return failNoRevoke("NOT_FOUND");
  }
  if (row.revokedAt) {
    return failNoRevoke("REVOKED");
  }

  const cfg = await getOrCreateTenantSecurity(tenantId);

  if (
    cfg.sessionAbsoluteMaxMinutes != null &&
    cfg.sessionAbsoluteMaxMinutes > 0
  ) {
    const elapsedMin = (now - row.createdAt.getTime()) / 60_000;
    if (elapsedMin >= cfg.sessionAbsoluteMaxMinutes) {
      return failAndRevoke("ABSOLUTE", row.id);
    }
  }

  if (
    cfg.sessionIdleTimeoutMinutes != null &&
    cfg.sessionIdleTimeoutMinutes > 0
  ) {
    const idleMs = now - row.lastSeenAt.getTime();
    const limitMs = cfg.sessionIdleTimeoutMinutes * 60_000;
    if (idleMs >= limitMs) {
      return failAndRevoke("IDLE", row.id);
    }
  }

  if (cfg.enforceIpWhitelist && params.role !== Role.SYSTEM_ADMIN) {
    const active = await prismaBase.allowedIpRule.findMany({
      where: { tenantId, isActive: true },
    });
    if (active.length > 0) {
      const passes = active.some((r: AllowedIpRule) =>
        clientMatchesIpRule(params.resolvedClientIp.trim(), r.cidr)
      );
      if (!passes) {
        return failAndRevoke("IP_WHITELIST", row.id);
      }
    }
  }

  const shouldTouch = now - row.lastSeenAt.getTime() >= SESSION_TOUCH_GAP_MS;
  if (shouldTouch) {
    await prismaBase.userAuthSession.updateMany({
      where: {
        id: row.id,
        revokedAt: null,
      },
      data: {
        lastSeenAt: new Date(now),
      },
    });
  }

  return { ok: true };
}
