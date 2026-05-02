import type { AlertLevel, AlertType } from "@prisma/client";
import { prismaBase } from "@/lib/prisma";

export type SeedAlertsWorkerRef = { id: string; name: string };

export type SeedAlertsResult = {
  alertsCreated: number;
  notificationEventsCreated: number;
  workers: SeedAlertsWorkerRef[];
  warnings: string[];
};

function stripDiacritics(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .toLowerCase();
}

/**
 * Resolve two workers for sample data: prefer "Onur Kurt" and "REŞAT ONUR Kurt" (case/accent insensitive).
 * Falls back to first distinct workers in the tenant.
 */
async function resolveTwoWorkers(
  tenantId: string
): Promise<{ wA: { id: string; firstName: string; lastName: string }; wB: { id: string; firstName: string; lastName: string }; warnings: string[] }> {
  const warnings: string[] = [];
  const list = await prismaBase.worker.findMany({
    where: { tenantId },
    select: { id: true, firstName: true, lastName: true },
    orderBy: { createdAt: "asc" },
    take: 40,
  });

  if (list.length === 0) {
    throw new Error(
      "Bu kiracıda çalışan yok. Önce çalışan ekleyin veya seed’i verisi olan bir hesapta çalıştırın."
    );
  }

  const scored = list.map((w) => {
    const fn = stripDiacritics(w.firstName);
    const ln = stripDiacritics(w.lastName);
    const full = `${fn} ${ln}`;
    return { w, fn, ln, full };
  });

  const resatOnur = scored.find(
    (x) => x.ln.includes("kurt") && (x.fn.includes("resat") || x.full.includes("resat onur"))
  );

  const plainOnur = scored.find(
    (x) =>
      x.ln.includes("kurt") &&
      x.fn.includes("onur") &&
      !x.fn.includes("resat") &&
      (!resatOnur || x.w.id !== resatOnur.w.id)
  );

  let wA = plainOnur?.w ?? list[0];
  let wB = resatOnur?.w ?? list.find((w) => w.id !== wA.id) ?? wA;

  if (!plainOnur) {
    warnings.push(
      '"Onur Kurt" eşleşmesi bulunamadı; ilk uygun çalışan kullanıldı.'
    );
  }
  if (!resatOnur) {
    warnings.push(
      '"REŞAT ONUR Kurt" eşleşmesi bulunamadı; ikinci çalışan için sıradaki kayıt kullanıldı.'
    );
  }
  if (wA.id === wB.id && list.length > 1) {
    wB = list.find((w) => w.id !== wA.id) ?? wB;
    warnings.push("İki ayrı isim bulunamadı; farklı çalışanlar için mevcut kayıtlar kullanıldı.");
  }

  return { wA, wB, warnings };
}

type AlertSeedRow = {
  workerId: string;
  alertType: AlertType;
  level: AlertLevel;
  message: string;
  dedupeKey: string;
  isRead: boolean;
};

/**
 * Idempotent-friendly inserts: unique `dedupeKey` (per tenant) and `idempotencyKey` (global) use a time suffix.
 * Creates CRITICAL/HIGH `Alert` rows and related `NotificationEvent` rows (visa / RTW types).
 */
export async function seedTestAlertsForTenant(tenantId: string): Promise<SeedAlertsResult> {
  const { wA, wB, warnings } = await resolveTwoWorkers(tenantId);
  const suffix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  const nameA = `${wA.firstName} ${wA.lastName}`.trim();
  const nameB = `${wB.firstName} ${wB.lastName}`.trim();

  const alertRows: AlertSeedRow[] = [
    {
      workerId: wA.id,
      alertType: "VISA_EXPIRING",
      level: "CRITICAL",
      message: `[VISA_EXPIRING_7_DAYS] ${nameA}: BRP/vize bitişine 7 gün kaldı (örnek uyarı).`,
      dedupeKey: `seed:visa7:crit:${wA.id}:${suffix}`,
      isRead: false,
    },
    {
      workerId: wB.id,
      alertType: "DEADLINE_APPROACHING",
      level: "HIGH",
      message: `[RIGHT_TO_WORK_RECHECK] ${nameB}: RTW yeniden kontrol son tarihi yaklaşıyor (örnek).`,
      dedupeKey: `seed:rtw:high:${wB.id}:${suffix}`,
      isRead: false,
    },
    {
      workerId: wA.id,
      alertType: "VISA_EXPIRING",
      level: "HIGH",
      message: `[VISA_EXPIRING_7_DAYS] ${nameA}: okunmuş örnek uyarı.`,
      dedupeKey: `seed:visa7:read:${wA.id}:${suffix}`,
      isRead: true,
    },
  ];

  let alertsCreated = 0;
  for (const row of alertRows) {
    try {
      await prismaBase.alert.create({
        data: {
          tenantId,
          workerId: row.workerId,
          alertType: row.alertType,
          level: row.level,
          message: row.message,
          dedupeKey: row.dedupeKey,
          isRead: row.isRead,
        },
      });
      alertsCreated += 1;
    } catch (e) {
      warnings.push(`Alert oluşturulamadı (${row.dedupeKey}): ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  const dueSoon = new Date();
  dueSoon.setDate(dueSoon.getDate() + 7);
  const dueMonth = new Date();
  dueMonth.setDate(dueMonth.getDate() + 30);

  const neSpecs = [
    {
      workerId: wA.id,
      eventType: "VISA_EXPIRING_7_DAYS" as const,
      idempotencyKey: `seed-ne-visa7-${wA.id}-${suffix}`,
      dueDate: dueSoon,
      status: "PENDING" as const,
      reportedDate: null as Date | null,
    },
    {
      workerId: wB.id,
      eventType: "RIGHT_TO_WORK_RECHECK_30_DAYS" as const,
      idempotencyKey: `seed-ne-rtw30-${wB.id}-${suffix}`,
      dueDate: dueMonth,
      status: "PENDING" as const,
      reportedDate: null as Date | null,
    },
    {
      workerId: wB.id,
      eventType: "RIGHT_TO_WORK_RECHECK_7_DAYS" as const,
      idempotencyKey: `seed-ne-rtw7-done-${wB.id}-${suffix}`,
      dueDate: new Date(),
      status: "COMPLETED" as const,
      reportedDate: new Date(),
    },
  ];

  let notificationEventsCreated = 0;
  for (const ne of neSpecs) {
    try {
      await prismaBase.notificationEvent.create({
        data: {
          tenantId,
          workerId: ne.workerId,
          eventType: ne.eventType,
          idempotencyKey: ne.idempotencyKey,
          dueDate: ne.dueDate,
          status: ne.status,
          reportedDate: ne.reportedDate,
        },
      });
      notificationEventsCreated += 1;
    } catch (e) {
      warnings.push(
        `NotificationEvent oluşturulamadı (${ne.idempotencyKey}): ${e instanceof Error ? e.message : String(e)}`
      );
    }
  }

  return {
    alertsCreated,
    notificationEventsCreated,
    workers: [
      { id: wA.id, name: nameA },
      { id: wB.id, name: nameB },
    ],
    warnings,
  };
}
