/**
 * Tek seferlik: vize / sponsorluk / RTW penceresi NotificationEvent kayıtlarını güncel çalışan verisiyle
 * hizalar (eskileri siler), sonlandırılmış çalışanlardan bekleyen pencereleri kaldırır ve aynı
 * çalışan+tür+takvim günü için kopya satırları ayıklar.
 *
 * NotificationEvent üzerinde `message` kolonu yok; filtre eventType ve idempotent anahtarlara dayanır.
 *
 *   npx tsx scripts/clean-duplicate-alerts.ts
 *   TENANT_ID=xyz npx tsx scripts/clean-duplicate-alerts.ts
 *   DRY_RUN=1 → sonlandırılmış çalışan + duplicate birleştirme adımlarında silme yok (yalnızca sayım loglanır).
 */
import type { EmploymentStatus, NotificationStatus } from "@prisma/client";
import { config } from "dotenv";
import { resolve } from "path";
import { prismaBase } from "@/lib/prisma";
import { startOfDay } from "@/lib/dates";
import {
  WINDOW_COMPLIANCE_NOTIFICATION_TYPES,
  pruneStalePendingRtwRecheckEvents,
  pruneStalePendingSponsorshipEndingEvents,
  pruneStalePendingVisaEvents,
} from "@/lib/scheduler/prune-stale-notification-events";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

const tenantFilter = process.env.TENANT_ID?.trim();
const dryRun = process.env.DRY_RUN === "1" || process.env.DRY_RUN === "true";

const tenantWhere =
  tenantFilter !== undefined && tenantFilter.length > 0
    ? { tenantId: tenantFilter }
    : {};

const PENDING_OR_OVERDUE: NotificationStatus[] = ["PENDING", "OVERDUE"];

async function dedupeSameWorkerTypeDay(): Promise<number> {
  const baseWhere = {
    status: { in: PENDING_OR_OVERDUE },
    eventType: { in: WINDOW_COMPLIANCE_NOTIFICATION_TYPES },
    ...tenantWhere,
  };

  const events = await prismaBase.notificationEvent.findMany({
    where: baseWhere,
    select: {
      id: true,
      workerId: true,
      eventType: true,
      dueDate: true,
      updatedAt: true,
    },
  });

  const groups = new Map<string, typeof events>();
  for (const e of events) {
    const day = startOfDay(e.dueDate).toISOString();
    const k = `${e.workerId}\t${e.eventType}\t${day}`;
    const arr = groups.get(k) ?? [];
    arr.push(e);
    groups.set(k, arr);
  }

  const idsToDelete: string[] = [];
  for (const [, arr] of Array.from(groups.entries())) {
    if (arr.length <= 1) continue;
    const sorted = [...arr].sort(
      (a, b) =>
        b.updatedAt.getTime() - a.updatedAt.getTime() || a.id.localeCompare(b.id)
    );
    idsToDelete.push(...sorted.slice(1).map((x) => x.id));
  }

  if (idsToDelete.length === 0) return 0;
  if (dryRun) {
    console.log(
      `[clean-duplicate-alerts] DRY_RUN: duplicate (aynı çalışan+tip+gün): ${idsToDelete.length} satır silinecekti`
    );
    return idsToDelete.length;
  }
  const r = await prismaBase.notificationEvent.deleteMany({
    where: { id: { in: idsToDelete } },
  });
  return r.count;
}

async function main(): Promise<void> {
  console.log(
    `[clean-duplicate-alerts] Başlıyor (tenant=${tenantFilter ?? "tümü"}, DRY_RUN=${dryRun})`
  );

  const workers = await prismaBase.worker.findMany({
    where: {
      ...tenantWhere,
      employmentStatus: { not: "TERMINATED" },
    },
    select: {
      id: true,
      tenantId: true,
      visaExpiryDate: true,
      sponsorshipEndDate: true,
      rtwChecks: {
        where: { nextCheckDueAt: { not: null } },
        orderBy: { nextCheckDueAt: "asc" },
        take: 1,
        select: { id: true, nextCheckDueAt: true },
      },
    },
  });

  let visaSum = 0;
  let rtwSum = 0;
  let spSum = 0;
  for (const w of workers) {
    const { deleted: v } = await pruneStalePendingVisaEvents(prismaBase, {
      id: w.id,
      tenantId: w.tenantId,
      visaExpiryDate: w.visaExpiryDate,
    });
    visaSum += v;

    const c = w.rtwChecks[0];
    const { deleted: r } = await pruneStalePendingRtwRecheckEvents(prismaBase, {
      id: w.id,
      tenantId: w.tenantId,
      rtwNext:
        c?.nextCheckDueAt != null ? { id: c.id, nextCheckDueAt: c.nextCheckDueAt } : null,
    });
    rtwSum += r;

    const { deleted: s } = await pruneStalePendingSponsorshipEndingEvents(
      prismaBase,
      {
        id: w.id,
        tenantId: w.tenantId,
        sponsorshipEndDate: w.sponsorshipEndDate,
      }
    );
    spSum += s;
  }
  console.log(
    `[clean-duplicate-alerts] Stale prune — vize: ${visaSum}, RTW: ${rtwSum}, sponsorluk: ${spSum}`
  );

  const termWhere = {
    ...tenantWhere,
    status: { in: PENDING_OR_OVERDUE },
    worker: { employmentStatus: "TERMINATED" as EmploymentStatus },
    eventType: { in: WINDOW_COMPLIANCE_NOTIFICATION_TYPES },
  };
  if (dryRun) {
    const n = await prismaBase.notificationEvent.count({ where: termWhere });
    console.log(
      `[clean-duplicate-alerts] DRY_RUN: sonlandırılmış çalışan pencereleri silinecek: ${n}`
    );
  } else {
    const r = await prismaBase.notificationEvent.deleteMany({ where: termWhere });
    console.log(
      `[clean-duplicate-alerts] Sonlandırılmış çalışan pencereleri silindi: ${r.count}`
    );
  }

  const dup = await dedupeSameWorkerTypeDay();
  console.log(
    `[clean-duplicate-alerts] Duplicate (aynı gün + tip) — silinen: ${dryRun ? "(dry-run tahmini) " : ""}${dup}`
  );

  console.log("");
  console.log("[clean-duplicate-alerts] Bitti.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prismaBase.$disconnect();
  });
