const BATCH_SIZE = 100;

/**
 * Tüm kayıtları bellekte tutmadan cursor-tabanlı batch olarak işler.
 * `fetcher` her çağrıda bir sonraki batch'i döndürmeli; boş dizi bitişi işaret eder.
 * Sayaç döndüren işlemler için `processor`'ın döndürdüğü sayı toplanır.
 */
export async function forEachInBatches<T extends { id: string }>(
  fetcher: (cursor: string | undefined, take: number) => Promise<T[]>,
  processor: (item: T) => Promise<number>,
  batchSize = BATCH_SIZE
): Promise<number> {
  let cursor: string | undefined = undefined;
  let total = 0;
  while (true) {
    const batch = await fetcher(cursor, batchSize);
    if (batch.length === 0) break;
    for (const item of batch) {
      total += await processor(item);
    }
    if (batch.length < batchSize) break;
    cursor = batch[batch.length - 1].id;
  }
  return total;
}
