"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type {
  EventType,
  EventWorkflowState,
  EventStatus,
  NotificationEvent,
  NotificationStatus,
  NotificationType,
  WorkflowStepStatus,
  WorkflowStepType,
} from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EscalationBadge } from "@/components/notifications/EscalationBadge";
import { isClosedForExpiredDocument } from "@/lib/document-expiring-notification-closure";
import { formatDeadlineWindowLabel } from "@/lib/deadline-display";
import { useTranslation } from "@/contexts/LanguageContext";

type Row = NotificationEvent & {
  worker: { id: string; firstName: string; lastName: string; email: string };
};

type WorkflowAssignmentRow = {
  id: string;
  step: WorkflowStepType;
  status: WorkflowStepStatus;
  createdAt: string;
  event: {
    id: string;
    eventType: EventType;
    workflowState: EventWorkflowState;
    status: EventStatus;
    reportDeadline: string;
    worker: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
    };
  };
};

const NOTIFICATION_TYPES: NotificationType[] = [
  "NO_SHOW",
  "SALARY_REDUCTION",
  "WORK_LOCATION_CHANGE",
  "SPONSORSHIP_ENDED",
  "VISA_EXPIRING_90_DAYS",
  "VISA_EXPIRING_60_DAYS",
  "VISA_EXPIRING_30_DAYS",
  "VISA_EXPIRING_7_DAYS",
  "RIGHT_TO_WORK_RECHECK_60_DAYS",
  "RIGHT_TO_WORK_RECHECK_30_DAYS",
  "RIGHT_TO_WORK_RECHECK_7_DAYS",
  "SPONSORSHIP_ENDING_60_DAYS",
  "SPONSORSHIP_ENDING_30_DAYS",
  "SPONSORSHIP_ENDING_7_DAYS",
  "DOCUMENT_EXPIRING",
  "WORKER_MISSING_DOCUMENTS",
  "SALARY_DISCREPANCY",
  "UNAUTHORISED_ABSENCE",
];

const NOTIFICATION_STATUSES: NotificationStatus[] = [
  "PENDING",
  "OVERDUE",
  "COMPLETED",
  "CANCELLED",
];

function tEnum(
  t: (key: string, fallback?: string) => string,
  key: string,
  fallback: string
): string {
  const v = t(key, fallback);
  return v === key ? fallback : v;
}

function notificationTypeLabel(
  type: NotificationType | EventType,
  t: (key: string, fallback?: string) => string
): string {
  return tEnum(t, `notifications.type.${type}`, type);
}

function workflowStepLabel(
  step: WorkflowStepType,
  t: (key: string, fallback?: string) => string
): string {
  return tEnum(t, `notifications.workflow.step.${step}`, step);
}

function workflowStepStatusLabel(
  status: WorkflowStepStatus,
  t: (key: string, fallback?: string) => string
): string {
  return tEnum(t, `notifications.workflow.stepStatus.${status}`, status);
}

function workflowStateDisplay(
  state: EventWorkflowState,
  t: (key: string, fallback?: string) => string
): string {
  return tEnum(t, `notifications.workflow.state.${state}`, state);
}

function notificationStatusDisplay(
  row: Row,
  translate: (key: string, fallback?: string) => string
): string {
  if (
    row.eventType === "DOCUMENT_EXPIRING" &&
    row.status === "COMPLETED" &&
    isClosedForExpiredDocument(row.metadata)
  ) {
    return translate("notifications.status.documentEnded");
  }
  return tEnum(translate, `notifications.status.${row.status}`, row.status);
}

export default function NotificationsPage(): JSX.Element {
  const { t, locale } = useTranslation();
  const localeTag = locale === "tr" ? "tr-TR" : "en-GB";
  const [rows, setRows] = useState<Row[]>([]);
  const [status, setStatus] = useState<string>("all");
  const [type, setType] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [workflowRows, setWorkflowRows] = useState<WorkflowAssignmentRow[]>([]);
  const [workflowLoading, setWorkflowLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      setWorkflowLoading(true);
      const res = await fetch("/api/workflow/my-assignments", {
        credentials: "include",
      });
      if (res.ok) {
        const json = (await res.json()) as { data: WorkflowAssignmentRow[] };
        setWorkflowRows(json.data);
      } else {
        setWorkflowRows([]);
      }
      setWorkflowLoading(false);
    })();
  }, []);

  useEffect(() => {
    const q = new URLSearchParams();
    if (status !== "all") q.set("status", status);
    if (type !== "all") q.set("type", type);
    void (async () => {
      setLoading(true);
      const res = await fetch(`/api/notifications?${q.toString()}`, {
        credentials: "include",
      });
      if (res.ok) {
        const json = (await res.json()) as { data: Row[] };
        setRows(json.data);
      }
      setLoading(false);
    })();
  }, [status, type]);

  async function complete(id: string): Promise<void> {
    const res = await fetch(`/api/notifications/${id}/complete`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (res.ok) {
      setRows((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, status: "COMPLETED" as NotificationStatus } : r
        )
      );
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-navy">{t("notifications.title")}</h1>
        <p className="text-slate-600">{t("notifications.subtitle")}</p>
      </div>

      <Card className="border-brand-navy/20">
        <CardHeader>
          <CardTitle className="text-base">{t("notifications.workflowTitle")}</CardTitle>
          <p className="text-sm text-slate-600">{t("notifications.workflowHint")}</p>
        </CardHeader>
        <CardContent>
          {workflowLoading ? (
            <p className="text-sm text-slate-500">{t("common.loading")}</p>
          ) : workflowRows.length === 0 ? (
            <p className="text-sm text-slate-500">{t("notifications.workflowEmpty")}</p>
          ) : (
            <div className="overflow-x-auto rounded-md border border-slate-200">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("notifications.colStep")}</TableHead>
                    <TableHead>{t("notifications.colStatus")}</TableHead>
                    <TableHead>{t("notifications.colEvent")}</TableHead>
                    <TableHead>{t("notifications.colWorker")}</TableHead>
                    <TableHead>{t("notifications.colWorkflow")}</TableHead>
                    <TableHead>{t("notifications.colDeadline")}</TableHead>
                    <TableHead className="text-right">{t("notifications.colAction")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workflowRows.map((w) => (
                    <TableRow key={w.id}>
                      <TableCell className="text-xs font-medium">
                        {workflowStepLabel(w.step, t)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{workflowStepStatusLabel(w.status, t)}</Badge>
                      </TableCell>
                      <TableCell className="text-xs">{notificationTypeLabel(w.event.eventType, t)}</TableCell>
                      <TableCell className="text-sm">
                        {w.event.worker.firstName} {w.event.worker.lastName}
                      </TableCell>
                      <TableCell className="max-w-[140px]">
                        <Badge variant="outline" className="whitespace-normal text-[10px]">
                          {workflowStateDisplay(w.event.workflowState, t)}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs">
                        {new Date(w.event.reportDeadline).toLocaleDateString(localeTag)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button type="button" size="sm" variant="secondary" asChild>
                          <Link href={`/events#event-${w.event.id}`}>{t("notifications.openEvents")}</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="w-full sm:w-48">
          <label className="text-sm text-slate-600">{t("notifications.filterStatus")}</label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("common.all")}</SelectItem>
              {NOTIFICATION_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {tEnum(t, `notifications.status.${s}`, s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-full sm:w-56">
          <label className="text-sm text-slate-600">{t("notifications.filterType")}</label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("common.all")}</SelectItem>
              {NOTIFICATION_TYPES.map((evType) => (
                <SelectItem key={evType} value={evType}>
                  {notificationTypeLabel(evType, t)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {loading ? (
        <p>{t("common.loading")}</p>
      ) : (
        <div className="rounded-md border border-slate-200 bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("notifications.colWorker")}</TableHead>
                <TableHead>{t("notifications.filterType")}</TableHead>
                <TableHead>{t("notifications.colStatus")}</TableHead>
                <TableHead>{t("notifications.tableUrgency")}</TableHead>
                <TableHead>{t("notifications.tableReportDeadline")}</TableHead>
                <TableHead className="text-right">{t("notifications.colAction")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    {r.worker.firstName} {r.worker.lastName}
                  </TableCell>
                  <TableCell className="text-xs">{notificationTypeLabel(r.eventType, t)}</TableCell>
                  <TableCell>{notificationStatusDisplay(r, t)}</TableCell>
                  <TableCell>
                    <EscalationBadge
                      reportDeadlineAt={r.reportDeadlineAt}
                      dueDate={r.dueDate}
                      status={r.status}
                      completedLabel={
                        r.eventType === "DOCUMENT_EXPIRING" &&
                        isClosedForExpiredDocument(r.metadata)
                          ? t("notifications.status.documentEnded")
                          : undefined
                      }
                    />
                  </TableCell>
                  <TableCell className="text-xs">
                    <div>
                      {(r.reportDeadlineAt ?? r.dueDate) &&
                        new Date(r.reportDeadlineAt ?? r.dueDate).toLocaleDateString(localeTag)}
                    </div>
                    <div className="text-slate-500">
                      {formatDeadlineWindowLabel(
                        r.eventType,
                        r.occurredAt,
                        r.reportDeadlineAt ?? r.dueDate,
                        locale
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {r.status === "PENDING" || r.status === "OVERDUE" ? (
                      <Button
                        size="sm"
                        variant="success"
                        type="button"
                        onClick={() => void complete(r.id)}
                      >
                        {t("notifications.complete")}
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
