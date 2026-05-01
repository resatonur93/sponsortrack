import type {
  Document,
  NotificationEvent,
  SalaryHistory,
  Worker,
  WorkerChangeLog,
} from "@prisma/client";

export type AnomalySeverity = "HIGH" | "MEDIUM";

export type AnomalyFinding = {
  code: string;
  severity: AnomalySeverity;
  message: string;
  workerId?: string;
};

export function detectAnomalies(input: {
  workers: Worker[];
  salaryHistory: SalaryHistory[];
  changeLogs: WorkerChangeLog[];
  documents: Document[];
  notifications: NotificationEvent[];
}): AnomalyFinding[] {
  const findings: AnomalyFinding[] = [];
  const byAddress = new Map<string, string[]>();

  for (const w of input.workers) {
    const key = (w.workLocation ?? "").trim().toLowerCase();
    if (key.length > 4) {
      const arr = byAddress.get(key) ?? [];
      arr.push(w.id);
      byAddress.set(key, arr);
    }
  }

  for (const [addr, ids] of Array.from(byAddress.entries())) {
    if (ids.length >= 3) {
      findings.push({
        code: "SHARED_ADDRESS_CLUSTER",
        severity: "MEDIUM",
        message: `Aynı iş adresinde ${ids.length} çalışan: ${addr.slice(0, 80)}…`,
      });
    }
  }

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const addressChangesByWorker = new Map<string, number>();
  for (const c of input.changeLogs) {
    if (c.changeCategory !== "ADDRESS") continue;
    if (c.createdAt < sixMonthsAgo) continue;
    addressChangesByWorker.set(
      c.workerId,
      (addressChangesByWorker.get(c.workerId) ?? 0) + 1
    );
  }
  for (const [workerId, n] of Array.from(addressChangesByWorker.entries())) {
    if (n > 2) {
      findings.push({
        code: "FREQUENT_ADDRESS_CHANGE",
        severity: "MEDIUM",
        message: `Son 6 ayda ${n} adres güncellemesi`,
        workerId,
      });
    }
  }

  const salaryDrops = input.salaryHistory.filter(
    (s) => s.oldSalary > 0 && s.newSalary < s.oldSalary * 0.9
  );
  for (const s of salaryDrops) {
    const hasJust =
      (s.justification ?? "").trim().length > 10 ||
      (s.reason ?? "").trim().length > 10;
    if (!hasJust) {
      findings.push({
        code: "SALARY_DROP_NO_JUSTIFICATION",
        severity: "HIGH",
        message: `Maaş %10+ düştü, yeterli gerekçe yok (effective ${s.effectiveDate.toISOString().slice(0, 10)})`,
        workerId: s.workerId,
      });
    }
  }

  const visaTypeChanges = input.changeLogs.filter((c) => {
    if (c.createdAt < sixMonthsAgo) return false;
    if (c.changeCategory === "VISA") return true;
    return (
      c.changeCategory === "OTHER" && /visa/i.test(c.summary)
    );
  });
  if (visaTypeChanges.length >= 3) {
    findings.push({
      code: "RAPID_VISA_RELATED_CHANGES",
      severity: "MEDIUM",
      message: "Kısa sürede çok sayıda vize ile ilgili kayıt",
    });
  }

  const openDisc = input.notifications.filter(
    (n) =>
      n.eventType === "SALARY_DISCREPANCY" &&
      (n.status === "PENDING" || n.status === "OVERDUE")
  );
  for (const n of openDisc) {
    findings.push({
      code: "OPEN_PAYROLL_DISCREPANCY",
      severity: "HIGH",
      message: "Açık bordro uyumsuzluğu bildirimi",
      workerId: n.workerId,
    });
  }

  return findings;
}
