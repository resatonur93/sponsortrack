function ipv4Octets(ok: string): boolean {
  const p = ok.split(".").map((x) => parseInt(x, 10));
  return (
    p.length === 4 && p.every((n) => Number.isInteger(n) && n >= 0 && n <= 255)
  );
}

/** IPv4 adres veya IPv4 CIDR; IPv6 yalın adres (slash yok). */
export function isValidIpRule(candidate: string): boolean {
  const s = candidate.trim();
  if (!s) return false;

  if (s.includes(":")) {
    return !s.includes("/") && s.length <= 120;
  }

  if (s.includes("/")) {
    const [network, bitsStr] = s.split("/", 2);
    const bits = parseInt(bitsStr ?? "", 10);
    if (!Number.isInteger(bits) || bits < 0 || bits > 32) return false;
    return ipv4Octets(network.trim());
  }

  return ipv4Octets(s);
}
