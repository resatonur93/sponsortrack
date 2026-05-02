import { RtwCheckMethod } from "@prisma/client";
import { prismaBase } from "@/lib/prisma";
import { addDays, startOfDay } from "@/lib/dates";

export type PrepWorkersForAlertsDemoResult = {
  workerIds: string[];
  visaSponsorshipUpdated: number;
  rtwChecksTouched: number;
};

/**
 * Geliştirme: ilk N çalışanın vize / sponsorluk bitişini bugünden 5–40 gün aralığına çeker,
 * RTW `nextCheckDueAt` alanını yakın tarihe ayarlar (cron + escalation ile uyarı üretimi için).
 */
export async function prepWorkersForAlertsDemo(
  tenantId: string,
  actorUserId: string,
  options?: { maxWorkers?: number }
): Promise<PrepWorkersForAlertsDemoResult> {
  const max = Math.min(Math.max(options?.maxWorkers ?? 3, 1), 10);
  const workers = await prismaBase.worker.findMany({
    where: { tenantId, employmentStatus: { not: "TERMINATED" } },
    select: { id: true },
    orderBy: { updatedAt: "desc" },
    take: max,
  });

  if (workers.length === 0) {
    throw new Error("Bu kiracıda sonlandırılmamış çalışan yok.");
  }

  const now = new Date();
  /** Vize / sponsorluk / RTW için farklı pencereler (gün). */
  const visaOffsets = [25, 12, 38, 8, 33];
  const sponsorOffsets = [30, 20, 15, 35, 10];
  const rtwOffsets = [14, 9, 21, 6, 18];

  let visaSponsorshipUpdated = 0;
  let rtwChecksTouched = 0;
  const workerIds: string[] = [];

  for (let i = 0; i < workers.length; i++) {
    const { id } = workers[i];
    workerIds.push(id);
    const visaDay = visaOffsets[i % visaOffsets.length];
    const sponsorDay = sponsorOffsets[i % sponsorOffsets.length];
    const rtwDay = rtwOffsets[i % rtwOffsets.length];

    await prismaBase.worker.update({
      where: { id },
      data: {
        visaExpiryDate: startOfDay(addDays(now, visaDay)),
        sponsorshipEndDate: startOfDay(addDays(now, sponsorDay)),
      },
    });
    visaSponsorshipUpdated += 1;

    const latestRtw = await prismaBase.rightToWorkCheck.findFirst({
      where: { workerId: id, tenantId },
      orderBy: { checkedAt: "desc" },
    });
    const nextDue = startOfDay(addDays(now, rtwDay));
    if (latestRtw) {
      await prismaBase.rightToWorkCheck.update({
        where: { id: latestRtw.id },
        data: { nextCheckDueAt: nextDue },
      });
    } else {
      await prismaBase.rightToWorkCheck.create({
        data: {
          workerId: id,
          tenantId,
          createdByUserId: actorUserId,
          checkMethod: RtwCheckMethod.MANUAL_DOCUMENT_CHECK,
          outcomeSummary: "Demo RTW row for alert pipeline",
          nextCheckDueAt: nextDue,
        },
      });
    }
    rtwChecksTouched += 1;
  }

  return { workerIds, visaSponsorshipUpdated, rtwChecksTouched };
}
