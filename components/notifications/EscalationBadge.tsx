"use client";

import type { NotificationStatus } from "@prisma/client";
import {
  escalationBadgeClass,
  getEscalationLevel,
  type EscalationLevel,
} from "@/lib/escalation";

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
}): JSX.Element {
  const deadline = props.reportDeadlineAt
    ? new Date(props.reportDeadlineAt)
    : new Date(props.dueDate);
  const now = new Date();
  const level = getEscalationLevel(deadline, now, props.status);
  const d = daysUntil(deadline, now);

  let text: string;
  if (props.status === "OVERDUE") {
    text = "⚠️ Overdue";
  } else if (d <= 0) {
    text = "⚠️ Due today";
  } else {
    text = `⚠️ ${d} day${d === 1 ? "" : "s"}`;
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
