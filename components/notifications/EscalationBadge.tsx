"use client";

import type { NotificationStatus } from "@prisma/client";
import {
  escalationBadgeClass,
  getEscalationLevel,
  type EscalationLevel,
} from "@/lib/escalation";
import { useTranslation } from "@/contexts/LanguageContext";

function daysUntil(deadline: Date, now: Date): number {
  const ms =
    new Date(deadline).setHours(0, 0, 0, 0) -
    new Date(now).setHours(0, 0, 0, 0);
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export function EscalationBadge(props: {
  reportDeadlineAt: Date | string | null;
  dueDate: Date | string;
  status: NotificationStatus;
  /** Overrides default “completed” label (e.g. document validity ended). */
  completedLabel?: string | null;
}): JSX.Element {
  const { t } = useTranslation();

  if (props.status === "COMPLETED") {
    const label = props.completedLabel?.trim() || t("notifications.badge.completed");
    return (
      <span className="inline-flex items-center rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-700">
        {label}
      </span>
    );
  }
  if (props.status === "CANCELLED") {
    return (
      <span className="inline-flex items-center rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600">
        {t("notifications.badge.cancelled")}
      </span>
    );
  }

  const deadline = props.reportDeadlineAt
    ? new Date(props.reportDeadlineAt)
    : new Date(props.dueDate);
  const now = new Date();
  const level = getEscalationLevel(deadline, now, props.status);
  const d = daysUntil(deadline, now);

  let text: string;
  if (props.status === "OVERDUE") {
    text = `?? ${t("notifications.badge.overdue")}`;
  } else if (d <= 0) {
    text = `?? ${t("notifications.badge.dueToday")}`;
  } else {
    text = `?? ${t("notifications.badge.daysLeft", `${d} gün`)}: ${d}`;
  }

  return (
    <span
      className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium ${escalationBadgeClass(level)}`}
      title={`LEVEL_${level}`}
    >
      {text}
    </span>
  );
}

export function escalationLevelForRow(
  reportDeadlineAt: Date | string | null,
  dueDate: Date | string,
  status: NotificationStatus
): EscalationLevel {
  const deadline = reportDeadlineAt
    ? new Date(reportDeadlineAt)
    : new Date(dueDate);
  return getEscalationLevel(deadline, new Date(), status);
}
