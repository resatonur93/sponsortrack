import { headers } from "next/headers";
import { getServerSession } from "next-auth";
import type { NextRequest } from "next/server";
import { authOptions } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { readClientIpFromHeaders } from "@/lib/security/ip-match";
import { validateAndTouchAuthSession } from "@/lib/security/session-guard";
import { runWithTenantContext, type TenantContext } from "@/lib/tenant-context";
import type { Role } from "@prisma/client";

export type SessionUser = {
  id: string;
  email: string;
  role: Role;
  tenantId: string;
  firstName: string;
  lastName: string;
  authSid?: string;
};

async function headersForLookup(
  requestHeaders?: Headers
): Promise<Headers> {
  if (requestHeaders) return requestHeaders;
  try {
    return await headers();
  } catch {
    return new Headers();
  }
}

/**
 * Güvenilir istemci kimliği: JWT `authSid` satırının geçerli olması ve
 * tenant IP / oturum süre politikalarına uyum gerekir.
 */
export async function getSessionUser(
  requestHeaders?: Headers
): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.tenantId) {
    return null;
  }

  const hdrs = await headersForLookup(requestHeaders);
  const ip = readClientIpFromHeaders(hdrs);
  const authSid = session.user.authSid;

  /**
   * Güvenlik özelliği öncesi üretilmiş JWT’lerde `authSid` yoktur; kullanıcıyı tamamen
   * dışarı atmamak için bu geçiş döneminde guard atlanır — bir sonraki girişte satır oluşur.
   */
  if (!authSid?.trim()) {
    logger.warn("getSessionUser: session without authSid — legacy JWT path", {
      userId: session.user.id,
    });
    return {
      id: session.user.id,
      email: session.user.email ?? "",
      role: session.user.role,
      tenantId: session.user.tenantId,
      firstName: session.user.firstName,
      lastName: session.user.lastName,
      authSid: undefined,
    };
  }

  const guard = await validateAndTouchAuthSession({
    tenantId: session.user.tenantId,
    userId: session.user.id,
    role: session.user.role,
    authSid,
    resolvedClientIp: ip,
  });
  if (!guard.ok) {
    return null;
  }

  return {
    id: session.user.id,
    email: session.user.email ?? "",
    role: session.user.role,
    tenantId: session.user.tenantId,
    firstName: session.user.firstName,
    lastName: session.user.lastName,
    authSid,
  };
}

export function buildTenantContext(
  user: SessionUser,
  req?: NextRequest
): TenantContext {
  return {
    tenantId: user.tenantId,
    userId: user.id,
    ipAddress: req?.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
    userAgent: req?.headers.get("user-agent") ?? undefined,
  };
}

export async function withTenant<T>(
  user: SessionUser,
  req: NextRequest | undefined,
  fn: () => Promise<T>
): Promise<T> {
  return runWithTenantContext(buildTenantContext(user, req), fn);
}
