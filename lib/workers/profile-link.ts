/** Çalışan profil/detay rotası (`app/(protected)/workers/[id]`). */
export function workerProfileHref(workerId: string): string {
  return `/workers/${workerId}`;
}
