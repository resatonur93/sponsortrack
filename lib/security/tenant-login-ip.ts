import { prismaBase } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { clientMatchesIpRule, normalizeIp } from "@/lib/security/ip-match";

export async function getOrCreateTenantSecurity(tenantId: string) {
  const existing = await prismaBase.tenantSecuritySettings.findUnique({
    where: { tenantId },
  });
  if (existing) return existing;
  return prismaBase.tenantSecuritySettings.create({
    data: { tenantId },
  });
}

/** Kimlik doğrulama sırasında: tenant IP beyaz liste kuralına uyuyor mu. */
export async function isTenantLoginIpAllowed(params: {
  tenantId: string;
  resolvedClientIp: string;
}): Promise<boolean> {
  const cfg = await getOrCreateTenantSecurity(params.tenantId);
  if (!cfg.enforceIpWhitelist) {
    return true;
  }

  const rules = await prismaBase.allowedIpRule.findMany({
    where: { tenantId: params.tenantId, isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  if (rules.length === 0) {
    logger.warn("tenant IP whitelist enforced but zero rules — allowing login once", {
      tenantId: params.tenantId,
    });
    return true;
  }

  const candidate = normalizeIp(params.resolvedClientIp);
  if (!candidate || candidate === "0.0.0.0") {
    logger.warn("login IP whitelist: missing client ip", {
      tenantId: params.tenantId,
      raw: params.resolvedClientIp,
    });
    return false;
  }

  for (const rule of rules) {
    try {
      if (clientMatchesIpRule(candidate, rule.cidr.trim())) return true;
    } catch {
      /* kural yazım hatası — atla */
    }
  }

  logger.warn("login blocked by tenant IP whitelist", {
    tenantId: params.tenantId,
    ip: candidate,
  });
  return false;
}
