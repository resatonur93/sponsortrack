import { NextRequest, NextResponse } from "next/server";
import { prismaBase } from "@/lib/prisma";
import { getSessionUser } from "@/lib/api-context";
import { requireAuthorisingOfficer } from "@/lib/admin-auth";
import { getOrCreateTenantSecurity } from "@/lib/security/tenant-login-ip";

export const dynamic = "force-dynamic";

/**
 * Güvenlik ekranı: kiracı ayarları + oturumlar + IP kuralları + güvenilir cihazlar.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const user = await getSessionUser(req.headers);
  if (!requireAuthorisingOfficer(user)) {
    return NextResponse.json(
      { error: user ? "Forbidden" : "Unauthorized" },
      { status: user ? 403 : 401 }
    );
  }

  const tenantId = user.tenantId;
  const tenantSettings = await getOrCreateTenantSecurity(tenantId);

  const [sessions, allowedIps, trustedDevices] = await Promise.all([
    prismaBase.userAuthSession.findMany({
      where: { tenantId, revokedAt: null },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
      orderBy: { lastSeenAt: "desc" },
      take: 200,
    }),
    prismaBase.allowedIpRule.findMany({
      where: { tenantId },
      orderBy: { sortOrder: "asc" },
    }),
    prismaBase.userTrustedDevice.findMany({
      where: { tenantId },
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
      orderBy: { lastSeenAt: "desc" },
      take: 250,
    }),
  ]);

  return NextResponse.json({
    tenant: tenantSettings,
    sessions: sessions.map((s) => ({
      id: s.id,
      userId: s.userId,
      userEmail: s.user.email,
      userName:
        `${s.user.firstName} ${s.user.lastName}`.trim() ||
        s.user.email ||
        "",
      deviceLabel: s.deviceLabel ?? "—",
      userAgentSnippet: s.userAgent
        ? `${s.userAgent.slice(0, 120)}${s.userAgent.length > 120 ? "…" : ""}`
        : null,
      ip: s.ip ?? "—",
      lastSeenAt: s.lastSeenAt.toISOString(),
      createdAt: s.createdAt.toISOString(),
      isCurrent: Boolean(user.authSid && s.sessionToken === user.authSid),
    })),
    allowedIps,
    trustedDevices: trustedDevices.map((d) => ({
      id: d.id,
      userId: d.userId,
      userEmail: d.user.email,
      userName:
        `${d.user.firstName} ${d.user.lastName}`.trim() ||
        d.user.email ||
        "",
      fingerprintPreview: `${d.fingerprint.slice(0, 10)}…`,
      label: d.label,
      trusted: d.trusted,
      lastIp: d.lastIp ?? "—",
      lastSeenAt: d.lastSeenAt.toISOString(),
      createdAt: d.createdAt.toISOString(),
      trustedAt: d.trustedAt?.toISOString() ?? null,
    })),
  });
}
