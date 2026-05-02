/**
 * IPv4 CIDR veya düz adres; IPv6 ise yalnızca tam dizgi eşleşmesi.
 */

export function normalizeIp(candidate: string | null | undefined): string | null {
  if (!candidate?.trim()) return null;
  return candidate.trim();
}

export function ipv4ToInt(parts: readonly number[]): number {
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

function ipv4IntoParts(raw: string): number[] | null {
  const p = raw.split(".").map((x) => parseInt(x, 10));
  if (p.length !== 4 || p.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return null;
  return p;
}

export function ipv4MatchesCidr(clientIpRaw: string, cidrRaw: string): boolean {
  const trimmed = cidrRaw.trim();
  const [network, maskBitsStr] = trimmed.includes("/") ? trimmed.split("/", 2) : [trimmed, "32"];
  const cb = ipv4IntoParts(clientIpRaw.trim());
  const nb = ipv4IntoParts(network.trim());
  if (!cb || !nb) return false;
  const maskBits = Math.min(Math.max(parseInt(maskBitsStr || "32", 10) || 0, 0), 32);
  const mask =
    maskBits === 0
      ? 0
      : maskBits === 32
        ? 0xffffffff
        : (~0 >>> 0 << (32 - maskBits)) >>> 0;
  return (ipv4ToInt(nb) & mask) === (ipv4ToInt(cb) & mask);
}

export function clientMatchesIpRule(clientIp: string, ruleCidr: string): boolean {
  const c = normalizeIp(clientIp);
  const rule = ruleCidr.trim();
  if (!c || !rule) return false;

  /** IPv6: yalnızca tam adres eşlemesi desteklenir (CIDR yok). */
  if (rule.includes(":") || c.includes(":")) {
    return c.toLowerCase() === rule.toLowerCase().split("/")[0]?.toLowerCase();
  }

  /** IPv4: / veya düz adres. */
  if (rule.includes("/")) {
    return ipv4MatchesCidr(c, rule);
  }

  /** IPv4 plain */
  return normalizeIp(rule)?.trim() === c.trim();
}

export function readClientIpFromHeaders(hdrs: Headers): string {
  const xff = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (xff) return xff;
  const xr = hdrs.get("x-real-ip")?.trim();
  if (xr) return xr;
  return "0.0.0.0";
}
