/**
 * Tek seferlik: `/api/alerts/seed` ile üretilen test kayıtlarını siler.
 *
 *   npx tsx scripts/clean-test-alerts.ts
 *   TENANT_ID=xyz npx tsx scripts/clean-test-alerts.ts
 *   CLEAR_ALL_NOTIFICATION_EMAIL_LOG=1 npx tsx scripts/clean-test-alerts.ts
 *
 * NotificationEvent’te `message` kolonu yok; eşleşme `idempotencyKey` prefix `seed-`.
 */
import { config } from "dotenv";
import { resolve } from "path";
import type { Prisma } from "@prisma/client";
import { prismaBase } from "@/lib/prisma";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

const tenantFilter = process.env.TENANT_ID?.trim();

async function main(): Promise<void> {
  const neWhere =
    tenantFilter !== undefined && tenantFilter.length > 0
      ? { tenantId: tenantFilter, idempotencyKey: { startsWith: "seed-" } }
      : { idempotencyKey: { startsWith: "seed-" } };

  const seedEvents = await prismaBase.notificationEvent.findMany({
    where: neWhere,
    select: { id: true, idempotencyKey: true, tenantId: true },
  });
  console.log(`[clean] NotificationEvent (idempotencyKey seed-*): ${seedEvents.length} bulundu`);
  seedEvents.slice(0, 25).forEach((r) => {
    console.log(`      - ${r.id} | tenant=${r.tenantId} | ${r.idempotencyKey}`);
  });
  if (seedEvents.length > 25) {
    console.log(`      ... +${seedEvents.length - 25} satır`);
  }

  const seedNeIds = seedEvents.map((e) => e.id);
  if (seedNeIds.length > 0) {
    const r = await prismaBase.notificationEmailLog.deleteMany({
      where: { notificationEventId: { in: seedNeIds } },
    });
    console.log(`[clean] NotificationEmailLog (bu NE id’lerine bağlı): ${r.count} silindi`);
  }

  if (process.env.CLEAR_ALL_NOTIFICATION_EMAIL_LOG === "1") {
    const all = await prismaBase.notificationEmailLog.deleteMany({});
    console.log(`[clean] TÜM NotificationEmailLog silindi: ${all.count}`);
  }

  const neDeleted = await prismaBase.notificationEvent.deleteMany({ where: neWhere });
  console.log(`[clean] NotificationEvent silindi: ${neDeleted.count}`);

  const sampleMsg: Prisma.StringFilter = {
    contains: "örnek uyarı",
    mode: "insensitive",
  };
  const alertWhere: Prisma.AlertWhereInput =
    tenantFilter !== undefined && tenantFilter.length > 0
      ? {
          tenantId: tenantFilter,
          OR: [{ dedupeKey: { startsWith: "seed:" } }, { message: sampleMsg }],
        }
      : {
          OR: [{ dedupeKey: { startsWith: "seed:" } }, { message: sampleMsg }],
        };

  const alertDeleted = await prismaBase.alert.deleteMany({ where: alertWhere });
  console.log(`[clean] Alert (seed: / örnek uyarı) silindi: ${alertDeleted.count}`);

  console.log("");
  console.log(
    "[clean] Tamamlandı. Cron üretimi `idempotencyKey` genelde worker:... ile kalır."
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prismaBase.$disconnect();
  });
