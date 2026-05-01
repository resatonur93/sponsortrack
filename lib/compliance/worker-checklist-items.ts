import type { WorkerDetailPayload } from "@/lib/workers/types";

export type ComplianceChecklistItemModel = {
  id: string;
  ok: boolean;
  titleKey: string;
  subtitleKey: string;
};

/** Core sponsor licence snapshot checks for the compliance tab progress bar */
export function buildWorkerComplianceChecklistItems(
  worker: WorkerDetailPayload
): ComplianceChecklistItemModel[] {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const cosRefOk = worker.cosReference.trim().length > 0;
  const cosExpiry = worker.cosExpiryDate ? new Date(worker.cosExpiryDate) : null;
  const cosOk =
    cosRefOk && cosExpiry !== null && cosExpiry >= startOfToday;

  const visaExpiry = worker.visaExpiryDate
    ? new Date(worker.visaExpiryDate)
    : null;
  const visaOk =
    visaExpiry !== null && visaExpiry >= startOfToday && Boolean(worker.visaType?.trim());

  const salarySocOk =
    worker.salary > 0 && worker.occupationCode.trim().length > 0;

  const activeOk = worker.employmentStatus === "ACTIVE";

  return [
    {
      id: "sponsorship_active",
      ok: activeOk,
      titleKey: "workerDetail.complianceItemActiveTitle",
      subtitleKey: "workerDetail.complianceItemActiveSubtitle",
    },
    {
      id: "cos_valid",
      ok: cosOk,
      titleKey: "workerDetail.complianceItemCosTitle",
      subtitleKey: "workerDetail.complianceItemCosSubtitle",
    },
    {
      id: "visa_dates",
      ok: visaOk,
      titleKey: "workerDetail.complianceItemVisaTitle",
      subtitleKey: "workerDetail.complianceItemVisaSubtitle",
    },
    {
      id: "salary_soc",
      ok: salarySocOk,
      titleKey: "workerDetail.complianceItemSalaryTitle",
      subtitleKey: "workerDetail.complianceItemSalarySubtitle",
    },
  ];
}
