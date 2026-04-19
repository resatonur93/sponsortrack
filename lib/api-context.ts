import { getServerSession } from "next-auth";
import type { NextRequest } from "next/server";
import { authOptions } from "@/lib/auth";
import { runWithTenantContext, type TenantContext } from "@/lib/tenant-context";
import type { Role } from "@prisma/client";

export type SessionUser = {
  id: string;
  email: string;
  role: Role;
  tenantId: string;
  firstName: string;
  lastName: string;
};

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.tenantId) {
    return null;
  }
  return {
    id: session.user.id,
    email: session.user.email ?? "",
    role: session.user.role,
    tenantId: session.user.tenantId,
    firstName: session.user.firstName,
    lastName: session.user.lastName,
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
