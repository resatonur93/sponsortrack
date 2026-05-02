export type ComplianceTemplateVars = Record<string, string>;

/** `{{workerName}}` biçimini güvenli metin ile değiştirir (çift süslü parantez). */
export function applyTemplateVars(
  template: string,
  vars: ComplianceTemplateVars
): string {
  return template.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_m, rawKey: string) => {
    const key = String(rawKey).trim();
    if (key in vars) return vars[key] ?? "";
    return `{{${key}}}`;
  });
}
