import type { AlertLevel, AlertType } from "@prisma/client";
import { prismaBase } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { startOfDay } from "@/lib/dates";
import { evaluateMissingDocuments } from "@/lib/required-documents";

/** Takvim günü farkı (deadline - now). Negatif = gecikmiş. */
export function calendarDaysUntil(deadline: Date, now: Date): number {
  const a = startOfDay(deadline).getTime();
  const b = startOfDay(now).getTime();
  return Math.round((a - b) / (1000 * 60 * 60 * 24));
}

/** Kademeli eşik: 30/14 → LOW, 7/3 → MEDIUM, 1 / overdue → HIGH/CRITICAL */
export function escalationFromDaysRemaining(days: number): {
  level: AlertLevel;
  overdue: boolean;
} {
  if (days < 0) return { level: "CRITICAL", overdue: true };
  if (days <= 1) return { level: "HIGH", overdue: false };
  if (days <= 3) return { level: "MEDIUM", overdue: false };
  if (days <= 7) return { level: "MEDIUM", overdue: false };
  if (days <= 14) return { level: "LOW", overdue: false };
  if (days <= 30) return { level: "LOW", overdue: false };
  return { level: "LOW", overdue: false };
}

export function withinDeadlineAlertWindow(days: number): boolean {
  return days <= 30;
}

async function upsertAlert(input: {
  tenantId: string;
  workerId: string | null;
  dedupeKey: string;
  alertType: AlertType;
  level: AlertLevel;
  message: string;
  forceUnreadOnEscalate?: boolean;
}): Promise<void> {
  const existing = await prismaBase.alert.findUnique({
    where: {
      tenantId_dedupeKey: {
        tenantId: input.tenantId,
        dedupeKey: input.dedupeKey,
      },
    },
  });
  if (existing?.dismissedAt) return;

  const levelRank: Record<AlertLevel, number> = {
    LOW: 1,
    MEDIUM: 2,
    HIGH: 3,
    CRITICAL: 4,
  };
  const escalated =
    existing &&
    levelRank[input.level] > levelRank[existing.level as AlertLevel];

  await prismaBase.alert.upsert({
    where: {
      tenantId_dedupeKey: {
        tenantId: input.tenantId,
        dedupeKey: input.dedupeKey,
      },
    },
    create: {
      tenantId: input.tenantId,
      workerId: input.workerId ?? undefined,
      dedupeKey: input.dedupeKey,
      alertType: input.alertType,
      level: input.level,
      message: input.message,
      isRead: false,
    },
    update: {
      workerId: input.workerId ?? undefined,
      alertType: input.alertType,
      level: input.level,
      message: input.message,
      ...(input.forceUnreadOnEscalate && escalated ? { isRead: false } : {}),
    },
  });
}

export async function runEscalationAlertsCron(now: Date = new Date()): Promise<{
  tenantsProcessed: number;
  upserts: number;
  deletions: number;
}> {
  let upserts = 0;
  let deletions = 0;

  const tenants = await prismaBase.tenant.findMany({
    where: { isActive: true },
    select: { id: true },
  });

  for (const { id: tenantId } of tenants) {
    const complianceEvents = await prismaBase.complianceEvent.findMany({
      where: { tenantId },
      include: {
        worker: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    for (const ce of complianceEvents) {
      const dk = `ce:${ce.id}`;
      if (ce.status === "REPORTED" || ce.status === "CANCELLED") {
        const del = await prismaBase.alert.deleteMany({
          where: { tenantId, dedupeKey: dk },
        });
        deletions += del.count;
        continue;
      }

      const days = calendarDaysUntil(ce.reportDeadline, now);
      if (!withinDeadlineAlertWindow(days)) {
        const del = await prismaBase.alert.deleteMany({
          where: { tenantId, dedupeKey: dk },
        });
        deletions += del.count;
        continue;
      }

      const { level, overdue } = escalationFromDaysRemaining(days);
      const name = ce.worker
        ? `${ce.worker.firstName} ${ce.worker.lastName}`
        : "Worker";
      const alertType: AlertType = overdue
        ? "DEADLINE_OVERDUE"
        : "DEADLINE_APPROACHING";
      const msg = overdue
        ? `CRITICAL: Compliance report overdue (${Math.abs(days)}d) — ${name} — ${ce.eventType} (deadline ${ce.reportDeadline.toISOString().slice(0, 10)}).`
        : `${level}: Report due in ${days}d — ${name} — ${ce.eventType} (deadline ${ce.reportDeadline.toISOString().slice(0, 10)}).`;

      await upsertAlert({
        tenantId,
        workerId: ce.workerId,
        dedupeKey: dk,
        alertType,
        level,
        message: msg,
        forceUnreadOnEscalate: true,
      });
      upserts += 1;
    }

    const notifications = await prismaBase.notificationEvent.findMany({
      where: {
        tenantId,
        status: { in: ["PENDING", "OVERDUE"] },
      },
      include: {
        worker: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    for (const n of notifications) {
      const dk = `ne:${n.id}`;
      const deadline = n.reportDeadlineAt ?? n.dueDate;
      const days = calendarDaysUntil(deadline, now);
      if (!withinDeadlineAlertWindow(days)) {
        const del = await prismaBase.alert.deleteMany({
          where: { tenantId, dedupeKey: dk },
        });
        deletions += del.count;
        continue;
      }

      const { level, overdue } = escalationFromDaysRemaining(days);
      const name = n.worker
        ? `${n.worker.firstName} ${n.worker.lastName}`
        : "Worker";
      const alertType: AlertType = overdue
        ? "DEADLINE_OVERDUE"
        : "DEADLINE_APPROACHING";
      const msg = overdue
        ? `Overdue notification: ${n.eventType} — ${name} (${Math.abs(days)}d late).`
        : `Notification deadline: ${n.eventType} — ${name} — ${days}d left.`;

      await upsertAlert({
        tenantId,
        workerId: n.workerId,
        dedupeKey: dk,
        alertType,
        level,
        message: msg,
        forceUnreadOnEscalate: true,
      });
      upserts += 1;

      if (n.eventType === "SALARY_DISCREPANCY") {
        await upsertAlert({
          tenantId,
          workerId: n.workerId,
          dedupeKey: `salary:${n.workerId}`,
          alertType: "SALARY_MISMATCH",
          level: "CRITICAL",
          message: `CRITICAL: Salary mismatch flagged — ${name}. Review payroll vs sponsorship.`,
          forceUnreadOnEscalate: true,
        });
        upserts += 1;
      }
      if (
        n.eventType === "UNAUTHORISED_ABSENCE" ||
        n.eventType === "UNPAID_OR_REDUCED_PAY_ABSENCE"
      ) {
        await upsertAlert({
          tenantId,
          workerId: n.workerId,
          dedupeKey: `absence:${n.id}`,
          alertType: "UNEXPLAINED_ABSENCE",
          level: n.status === "OVERDUE" ? "CRITICAL" : "HIGH",
          message: `Absence / pay event requires action — ${name} — ${n.eventType}.`,
          forceUnreadOnEscalate: true,
        });
        upserts += 1;
      }
      if (n.eventType === "CHANGE_OF_ROLE_OR_DUTIES") {
        await upsertAlert({
          tenantId,
          workerId: n.workerId,
          dedupeKey: `role:${n.id}`,
          alertType: "ROLE_CODE_MISMATCH",
          level: "HIGH",
          message: `Role / duties change pending SMS — ${name}.`,
          forceUnreadOnEscalate: true,
        });
        upserts += 1;
      }
    }

    const orgChanges = await prismaBase.orgChange.findMany({
      where: {
        tenantId,
        status: {
          in: ["PENDING", "IN_PROGRESS", "OVERDUE"],
        },
      },
    });
    for (const oc of orgChanges) {
      const ref = oc.hoReportDeadline;
      const days = calendarDaysUntil(ref, now);
      const level: AlertLevel =
        days < 0 ? "CRITICAL" : days <= 3 ? "HIGH" : days <= 14 ? "MEDIUM" : "LOW";
      await upsertAlert({
        tenantId,
        workerId: null,
        dedupeKey: `org:${oc.id}`,
        alertType: "ORG_CHANGE_PENDING",
        level,
        message: `Organisation change (${oc.changeType.replace(/_/g, " ")})${days < 0 ? " (overdue)" : ` (${days}d to HO deadline)`}.`,
        forceUnreadOnEscalate: true,
      });
      upserts += 1;
    }

    const workers = await prismaBase.worker.findMany({
      where: { tenantId, employmentStatus: { not: "TERMINATED" } },
      include: { documents: { where: { isDeleted: false } } },
    });

    for (const w of workers) {
      const miss = evaluateMissingDocuments(w, w.documents, now).filter(
        (m) => m.reason === "missing" || m.reason === "expired"
      );
      if (miss.length === 0) {
        const del = await prismaBase.alert.deleteMany({
          where: { tenantId, dedupeKey: `missing:${w.id}` },
        });
        deletions += del.count;
        continue;
      }
      const hasExpired = miss.some((m) => m.reason === "expired");
      const hasHigh = miss.some((m) => m.urgency === "HIGH");
      const level: AlertLevel = hasExpired
        ? "CRITICAL"
        : hasHigh
          ? "HIGH"
          : miss.some((m) => m.urgency === "MEDIUM")
            ? "MEDIUM"
            : "LOW";
      const name = `${w.firstName} ${w.lastName}`;
      const labels = miss.map((m) => m.label).join(", ");
      await upsertAlert({
        tenantId,
        workerId: w.id,
        dedupeKey: `missing:${w.id}`,
        alertType: "MISSING_DOCUMENT",
        level,
        message: `${level}: Missing / invalid documents — ${name}: ${labels}.`,
        forceUnreadOnEscalate: true,
      });
      upserts += 1;
    }

    for (const w of workers) {
      if (!w.visaExpiryDate) {
        const del = await prismaBase.alert.deleteMany({
          where: { tenantId, dedupeKey: `visa:${w.id}` },
        });
        deletions += del.count;
        continue;
      }
      const days = calendarDaysUntil(w.visaExpiryDate, now);
      if (days > 90 || days < -365) {
        const del = await prismaBase.alert.deleteMany({
          where: { tenantId, dedupeKey: `visa:${w.id}` },
        });
        deletions += del.count;
        continue;
      }
      const name = `${w.firstName} ${w.lastName}`;
      let level: AlertLevel = "LOW";
      let alertType: AlertType = "VISA_EXPIRING";
      if (days < 0) {
        level = "CRITICAL";
      } else if (days <= 7) {
        level = "CRITICAL";
      } else if (days <= 30) {
        level = "HIGH";
      } else {
        level = "MEDIUM";
      }
      const msg =
        days < 0
          ? `CRITICAL: Visa expired for ${name} (${Math.abs(days)}d ago). Possible illegal working risk.`
          : `Visa expiring in ${days}d — ${name}.`;
      await upsertAlert({
        tenantId,
        workerId: w.id,
        dedupeKey: `visa:${w.id}`,
        alertType,
        level,
        message: msg,
        forceUnreadOnEscalate: true,
      });
      upserts += 1;
    }

    const neAlerts = await prismaBase.alert.findMany({
      where: { tenantId, dedupeKey: { startsWith: "ne:" } },
      select: { id: true, dedupeKey: true },
    });
    for (const a of neAlerts) {
      const nid = a.dedupeKey.slice(3);
      const n = await prismaBase.notificationEvent.findUnique({
        where: { id: nid },
        select: { status: true, tenantId: true },
      });
      if (
        !n ||
        n.tenantId !== tenantId ||
        (n.status !== "PENDING" && n.status !== "OVERDUE")
      ) {
        await prismaBase.alert.delete({ where: { id: a.id } });
        deletions += 1;
      }
    }
  }

  logger.info("escalation alerts cron", {
    tenants: tenants.length,
    upserts,
    deletions,
  });

  return { tenantsProcessed: tenants.length, upserts, deletions };
}
