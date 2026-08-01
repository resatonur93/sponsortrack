/**
 * Tek, paylaşılan "uyum yüzdesi" hesabı — hem /dashboard hem de /audit sayfası
 * bu fonksiyonu kullanır ki iki sayfadaki uyum özeti sayıları hiçbir zaman ayrışmasın.
 */
export function computeCompliancePercent(
  totalWorkers: number,
  workersWithIssues: number
): number | null {
  if (totalWorkers <= 0) return null;
  return Math.round(((totalWorkers - workersWithIssues) / totalWorkers) * 100);
}
