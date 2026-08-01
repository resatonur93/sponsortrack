import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { prismaBase } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { normalizeEmail } from "@/lib/registration";
import { isTenantLoginIpAllowed } from "@/lib/security/tenant-login-ip";
import { isLoginRateLimited, recordLoginFailure, LoginAttemptScope } from "@/lib/security/login-rate-limit";
import { parsePageAccessOverrides, type PageAccessOverrides } from "@/lib/authorization/page-access";

export type TenantCredentialsResult =
  | {
      ok: true;
      user: {
        id: string;
        email: string;
        role: Role;
        tenantId: string;
        firstName: string;
        lastName: string;
        pageAccessOverrides: PageAccessOverrides;
      };
    }
  | { ok: false };

/**
 * Şifre + tenant durumu + IP whitelist doğrulaması. Hem lib/auth.ts'teki
 * CredentialsProvider.authorize() hem de /api/auth/request-otp bu tek yeri çağırır —
 * aynı mantık iki yerde tekrarlanmasın diye.
 */
export async function verifyTenantCredentials(params: {
  email: string;
  password: string;
  ip: string;
}): Promise<TenantCredentialsResult> {
  const normalized = normalizeEmail(params.email);

  if (
    await isLoginRateLimited({
      email: normalized,
      ip: params.ip,
      scope: LoginAttemptScope.TENANT_USER,
    })
  ) {
    logger.warn("login rejected: rate limited", { email: normalized, ip: params.ip });
    return { ok: false };
  }

  const user = await prismaBase.user.findFirst({
    where: { email: normalized, isActive: true },
    include: { tenant: true },
  });
  if (!user?.tenant.isActive) {
    await recordLoginFailure({
      email: normalized,
      ip: params.ip,
      scope: LoginAttemptScope.TENANT_USER,
    });
    return { ok: false };
  }
  const passwordOk = await bcrypt.compare(params.password, user.password);
  if (!passwordOk) {
    await recordLoginFailure({
      email: normalized,
      ip: params.ip,
      scope: LoginAttemptScope.TENANT_USER,
    });
    return { ok: false };
  }

  if (user.role !== Role.SYSTEM_ADMIN) {
    const allowed = await isTenantLoginIpAllowed({
      tenantId: user.tenantId,
      resolvedClientIp: params.ip,
    });
    if (!allowed) return { ok: false };
  }

  return {
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      firstName: user.firstName,
      lastName: user.lastName,
      pageAccessOverrides: parsePageAccessOverrides(user.pageAccessOverrides),
    },
  };
}
