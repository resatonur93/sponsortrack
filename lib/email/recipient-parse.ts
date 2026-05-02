/** Virgül / noktalı virgül / satır ile ayrılmış adres dizisinden tek SMTP `cc`/`bcc` dizesi. */
export function joinSmtpRecipients(csv: string | null | undefined): string | undefined {
  if (!csv?.trim()) return undefined;
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of csv.split(/[,;\n]+/)) {
    const t = part.trim();
    if (!t) continue;
    const k = t.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out.length ? out.join(", ") : undefined;
}
