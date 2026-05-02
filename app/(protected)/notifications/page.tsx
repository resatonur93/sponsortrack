"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import {
  AlertCircle,
  ArrowUpDown,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock,
  Inbox,
  ListChecks,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EscalationBadge } from "@/components/notifications/EscalationBadge";
import { isClosedForExpiredDocument } from "@/lib/documents/document-expiring-notification-closure";
import { formatDeadlineWindowLabel } from "@/lib/deadline-display";
import { useTranslation } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { getEscalationLevel, escalationBadgeClass } from "@/lib/escalation";
import { notificationTypeBadgeClass } from "@/lib/notifications/notification-visuals";

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

type SortKey = "due" | "worker" | "type";

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

const DEFER_DAY_OPTIONS = [7, 14, 21, 30] as const;

function tEnum(
  tt: (key: string, fallback?: string) => string,
  key: string,
  fallback: string
): string {
  const v = tt(key, fallback);
  return v === key ? fallback : v;
}

function notificationTypeLabel(
  type: NotificationType | EventType,
  tt: (key: string, fallback?: string) => string
): string {
  return tEnum(tt, `notifications.type.${type}`, type);
}

function workflowStepLabel(
  step: WorkflowStepType,
  tt: (key: string, fallback?: string) => string
): string {
  return tEnum(tt, `notifications.workflow.step.${step}`, step);
}

function workflowStepStatusLabel(
  status: WorkflowStepStatus,
  tt: (key: string, fallback?: string) => string
): string {
  return tEnum(tt, `notifications.workflow.stepStatus.${status}`, status);
}

function workflowStateDisplay(
  state: EventWorkflowState,
  tt: (key: string, fallback?: string) => string
): string {
  return tEnum(tt, `notifications.workflow.state.${state}`, state);
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

function workerInitials(w: Row["worker"]): string {
  return `${w.firstName?.[0] ?? ""}${w.lastName?.[0] ?? ""}`.toUpperCase() || "?";
}

function rowStatusBadgeClass(s: NotificationStatus): string {
  switch (s) {
    case "PENDING":
      return "border-amber-400/70 bg-amber-50 font-semibold text-amber-950 shadow-sm ring-1 ring-amber-300/50";
    case "OVERDUE":
      return "border-red-600/40 bg-red-600 font-semibold text-white shadow-sm";
    case "COMPLETED":
      return "border-emerald-500/35 bg-emerald-600 font-semibold text-white shadow-sm";
    default:
      return "border-slate-300 bg-slate-100 font-medium text-slate-700 shadow-sm ring-1 ring-slate-200/80";
  }
}

function sortRows(list: Row[], key: SortKey, dir: "asc" | "desc", tt: (k: string, f?: string) => string): Row[] {
  const copy = [...list];
  const sign = dir === "asc" ? 1 : -1;
  copy.sort((a, b) => {
    if (key === "due") {
      const av = new Date(a.reportDeadlineAt ?? a.dueDate).getTime();
      const bv = new Date(b.reportDeadlineAt ?? b.dueDate).getTime();
      return (av - bv) * sign;
    }
    if (key === "worker") {
      const aw = `${a.worker.lastName} ${a.worker.firstName}`.toLowerCase();
      const bw = `${b.worker.lastName} ${b.worker.firstName}`.toLowerCase();
      return aw.localeCompare(bw, undefined, { sensitivity: "base" }) * sign;
    }
    const at = notificationTypeLabel(a.eventType, tt).toLowerCase();
    const bt = notificationTypeLabel(b.eventType, tt).toLowerCase();
    return at.localeCompare(bt, undefined, { sensitivity: "base" }) * sign;
  });
  return copy;
}

function buildGroups(sorted: Row[]): {
  workerId: string;
  worker: Row["worker"];
  items: Row[];
}[] {
  const map = new Map<string, Row[]>();
  for (const r of sorted) {
    const arr = map.get(r.workerId) ?? [];
    arr.push(r);
    map.set(r.workerId, arr);
  }
  const groups = Array.from(map.entries()).map(([workerId, items]) => ({
    workerId,
    worker: items[0].worker,
    items,
  }));
  groups.sort((a, b) => {
    const ae = Math.min(
      ...a.items.map((x) => new Date(x.reportDeadlineAt ?? x.dueDate).getTime())
    );
    const be = Math.min(
      ...b.items.map((x) => new Date(x.reportDeadlineAt ?? x.dueDate).getTime())
    );
    return ae - be;
  });
  return groups;
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
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({
    key: "due",
    dir: "asc",
  });

  const [completingId, setCompletingId] = useState<string | null>(null);
  const [deferringId, setDeferringId] = useState<string | null>(null);
  const [detailRow, setDetailRow] = useState<Row | null>(null);
  const [deferTarget, setDeferTarget] = useState<Row | null>(null);
  const [deferDays, setDeferDays] = useState<number>(7);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setWorkflowLoading(true);
      const res = await fetch("/api/workflow/my-assignments", {
        credentials: "include",
      });
      if (!cancelled) {
        if (res.ok) {
          const json = (await res.json()) as { data: WorkflowAssignmentRow[] };
          setWorkflowRows(json.data);
        } else setWorkflowRows([]);
        setWorkflowLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const reloadNotifications = useCallback(async (): Promise<boolean> => {
    const q = new URLSearchParams();
    q.set("all", "1");
    if (status !== "all") q.set("status", status);
    if (type !== "all") q.set("type", type);

    const res = await fetch(`/api/notifications?${q.toString()}`, {
      credentials: "include",
    });
    if (!res.ok) return false;
    const json = (await res.json()) as { data: Row[] };
    setRows(json.data);
    return true;
  }, [status, type]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        await reloadNotifications();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadNotifications]);

  const sortedRows = useMemo(
    () => sortRows(rows, sort.key, sort.dir, t),
    [rows, sort, t]
  );
  const groups = useMemo(() => buildGroups(sortedRows), [sortedRows]);

  function toggleSort(key: SortKey): void {
    setSort((s) =>
      s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }
    );
  }

  async function complete(id: string): Promise<void> {
    setCompletingId(id);
    try {
      const res = await fetch(`/api/notifications/${id}/complete`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        window.alert(t("notifications.completeFailed"));
        return;
      }
      await reloadNotifications();
    } finally {
      setCompletingId(null);
    }
  }

  async function deferNotification(id: string, days: number): Promise<boolean> {
    setDeferringId(id);
    try {
      const res = await fetch(`/api/notifications/${id}/defer`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days }),
      });
      if (!res.ok) {
        window.alert(t("notifications.deferFailed"));
        return false;
      }
      await reloadNotifications();
      return true;
    } finally {
      setDeferringId(null);
    }
  }

  function openDefer(row: Row): void {
    setDeferTarget(row);
    setDeferDays(7);
  }

  function PriorityCell(props: { row: Row }): JSX.Element {
    const { row } = props;
    const deadline = new Date(row.reportDeadlineAt ?? row.dueDate);
    const level = getEscalationLevel(deadline, new Date(), row.status);

    let Icon = Clock;
    if (row.status === "COMPLETED" || row.status === "CANCELLED") Icon = CheckCircle2;
    else if (level === 3 || row.status === "OVERDUE") Icon = AlertCircle;
    else if (level === 2) Icon = AlertCircle;

    return (
      <div className="flex items-start gap-2">
        <span
          className={cn(
            "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border shadow-sm",
            escalationBadgeClass(level),
            row.status === "COMPLETED" && "border-emerald-200 bg-emerald-50 text-emerald-900"
          )}
        >
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <EscalationBadge
          reportDeadlineAt={row.reportDeadlineAt}
          dueDate={row.dueDate}
          status={row.status}
          completedLabel={
            row.eventType === "DOCUMENT_EXPIRING" && isClosedForExpiredDocument(row.metadata)
              ? t("notifications.status.documentEnded")
              : undefined
          }
        />
      </div>
    );
  }

  function SortBtn(props: {
    label: string;
    active: boolean;
    onClick: () => void;
  }): JSX.Element {
    const { label, active, onClick } = props;
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "-ml-1 inline-flex items-center gap-1 rounded-md px-1 py-0.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-600 transition-colors hover:bg-slate-100 hover:text-brand-navy",
          active && "text-brand-navy"
        )}
      >
        {label}
        <ArrowUpDown className="h-3.5 w-3.5 opacity-60" aria-hidden />
      </button>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-brand-navy md:text-3xl">{t("notifications.title")}</h1>
        <p className="max-w-3xl text-sm text-slate-600">{t("notifications.subtitle")}</p>
      </div>

      <Card className="overflow-hidden border-brand-navy/12 shadow-md ring-1 ring-slate-100">
        <CardHeader className="space-y-1 border-b border-slate-100 bg-gradient-to-r from-brand-navy/[0.04] to-white pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-navy/10 text-brand-navy">
                <ListChecks className="h-4 w-4" aria-hidden />
              </span>
              <div>
                <CardTitle className="text-lg text-brand-navy">{t("notifications.workflowTitle")}</CardTitle>
                <CardDescription className="max-w-2xl text-sm">
                  {t("notifications.workflowHint")}
                </CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="border-brand-navy/25 bg-white text-brand-navy tabular-nums shadow-sm">
              {workflowLoading ? "—" : workflowRows.length}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-5">
          {workflowLoading ? (
            <p className="text-sm text-slate-500">{t("common.loading")}</p>
          ) : workflowRows.length === 0 ? (
            <div className="flex flex-col items-center rounded-xl border border-dashed border-slate-200 bg-slate-50/40 px-6 py-12 text-center">
              <ClipboardList className="h-8 w-8 text-slate-400" aria-hidden />
              <p className="mt-3 text-sm font-medium text-brand-navy">{t("notifications.workflowEmpty")}</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm ring-1 ring-slate-100">
              <Table>
                <TableHeader className="bg-slate-50/90">
                  <TableRow className="border-slate-200 hover:bg-transparent">
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
                    <TableRow key={w.id} className="border-slate-100 hover:bg-slate-50/60">
                      <TableCell className="text-xs font-semibold">{workflowStepLabel(w.step, t)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[11px] font-semibold">
                          {workflowStepStatusLabel(w.status, t)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{notificationTypeLabel(w.event.eventType, t)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-navy/10 text-[10px] font-bold uppercase text-brand-navy ring-1 ring-brand-navy/15">
                            {workerInitials(w.event.worker)}
                          </span>
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium text-brand-navy">
                              {w.event.worker.firstName} {w.event.worker.lastName}
                            </div>
                            <div className="truncate text-[11px] text-slate-500">{w.event.worker.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[160px]">
                        <Badge variant="outline" className="whitespace-normal text-[10px] leading-tight shadow-sm">
                          {workflowStateDisplay(w.event.workflowState, t)}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs tabular-nums text-slate-700">
                        {new Date(w.event.reportDeadline).toLocaleDateString(localeTag)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button type="button" size="sm" variant="secondary" className="font-semibold" asChild>
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

      <Card className="border-brand-navy/10 shadow-sm ring-1 ring-slate-100">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-brand-navy">
            {t("notifications.filtersSection")}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:max-w-3xl lg:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-slate-700">{t("notifications.filterStatus")}</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-11 border-slate-200">
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
          <div className="space-y-2">
            <Label className="text-slate-700">{t("notifications.filterType")}</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="h-11 border-slate-200">
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
        </CardContent>
      </Card>

      <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-md ring-1 ring-slate-100">
        <Table>
          <TableHeader className="sticky top-0 z-[1] bg-slate-50/95 backdrop-blur">
            <TableRow className="border-slate-200 hover:bg-transparent">
              <TableHead>
                <SortBtn
                  label={t("notifications.colWorker")}
                  active={sort.key === "worker"}
                  onClick={() => toggleSort("worker")}
                />
              </TableHead>
              <TableHead>
                <SortBtn
                  label={t("notifications.colNotificationType")}
                  active={sort.key === "type"}
                  onClick={() => toggleSort("type")}
                />
              </TableHead>
              <TableHead>{t("notifications.colStatus")}</TableHead>
              <TableHead>{t("notifications.tableUrgency")}</TableHead>
              <TableHead>
                <SortBtn
                  label={t("notifications.tableReportDeadline")}
                  active={sort.key === "due"}
                  onClick={() => toggleSort("due")}
                />
              </TableHead>
              <TableHead className="text-right">{t("notifications.colAction")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-14 text-center text-sm text-slate-500">
                  {t("common.loading")}
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="p-0">
                  <div className="flex flex-col items-center px-8 py-16 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-brand-navy">
                      <Inbox className="h-7 w-7 opacity-70" aria-hidden />
                    </div>
                    <p className="mt-4 text-base font-semibold text-brand-navy">
                      {t("notifications.emptyStateTitle")}
                    </p>
                    <p className="mt-2 max-w-md text-sm text-slate-600">{t("notifications.emptyStateHint")}</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              groups.flatMap((g) => {
                const out: JSX.Element[] = [];
                if (g.items.length > 1) {
                  out.push(
                    <TableRow
                      key={`group-${g.workerId}`}
                      className="border-t-2 border-brand-navy/[0.08] bg-slate-50/90 hover:bg-slate-50/90"
                    >
                      <TableCell colSpan={6} className="py-2.5">
                        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-brand-navy">
                          <CalendarDays className="h-4 w-4 shrink-0 text-brand-navy/70" aria-hidden />
                          <Link href={`/workers/${g.worker.id}`} className="underline-offset-4 hover:underline">
                            {g.worker.firstName} {g.worker.lastName}
                          </Link>
                          <span className="font-normal tabular-nums text-slate-600">
                            {g.items.length} {t("notifications.groupCountSuffix")}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                }
                for (const r of g.items) {
                  out.push(
                    <TableRow
                      key={r.id}
                      className={cn(
                        "border-slate-100 transition-colors hover:bg-slate-50/80",
                        g.items.length > 1 ? "border-l-[3px] border-l-brand-gold/50" : null
                      )}
                    >
                      <TableCell className="align-top">
                        <div className="flex gap-3">
                          <Link
                            href={`/workers/${r.worker.id}`}
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-navy/10 text-xs font-bold text-brand-navy ring-2 ring-brand-navy/15 hover:bg-brand-navy/20"
                          >
                            {workerInitials(r.worker)}
                          </Link>
                          <div className="min-w-0">
                            <Link
                              href={`/workers/${r.worker.id}`}
                              className="font-semibold text-brand-navy hover:underline"
                            >
                              {r.worker.firstName} {r.worker.lastName}
                            </Link>
                            <div className="truncate text-xs text-slate-600">{r.worker.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        <Badge
                          variant="outline"
                          className={cn(
                            "max-w-[260px] whitespace-normal text-left text-xs font-semibold leading-snug",
                            notificationTypeBadgeClass(r.eventType)
                          )}
                        >
                          {notificationTypeLabel(r.eventType, t)}
                        </Badge>
                      </TableCell>
                      <TableCell className="align-top">
                        <Badge variant="outline" className={rowStatusBadgeClass(r.status)}>
                          {notificationStatusDisplay(r, t)}
                        </Badge>
                      </TableCell>
                      <TableCell className="align-top">
                        <PriorityCell row={r} />
                      </TableCell>
                      <TableCell className="align-top text-xs tabular-nums text-slate-700">
                        <div>
                          {(r.reportDeadlineAt ?? r.dueDate) &&
                            new Date(r.reportDeadlineAt ?? r.dueDate).toLocaleDateString(localeTag)}
                        </div>
                        <div className="max-w-[200px] text-[11px] leading-snug text-slate-500">
                          {formatDeadlineWindowLabel(
                            r.eventType,
                            r.occurredAt,
                            r.reportDeadlineAt ?? r.dueDate,
                            locale
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="flex flex-wrap justify-end gap-1.5">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 px-2.5 border-slate-200"
                            onClick={() => setDetailRow(r)}
                          >
                            {t("notifications.detail")}
                          </Button>
                          {(r.status === "PENDING" || r.status === "OVERDUE") && (
                            <>
                              <Button
                                type="button"
                                size="sm"
                                variant="success"
                                disabled={completingId === r.id}
                                title={t("notifications.completeTooltip")}
                                className="h-8 min-w-[92px] px-2 font-semibold"
                                onClick={() => void complete(r.id)}
                              >
                                {completingId === r.id ? t("common.loading") : t("notifications.complete")}
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={deferringId === r.id}
                                title={t("notifications.deferTooltip")}
                                className="h-8 border-amber-200 bg-amber-50/70 px-2 text-amber-950 hover:bg-amber-100"
                                onClick={() => openDefer(r)}
                              >
                                {t("notifications.defer")}
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                }
                return out;
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={detailRow !== null} onOpenChange={(o) => !o && setDetailRow(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("notifications.detailTitle")}</DialogTitle>
          </DialogHeader>
          {detailRow ? (
            <div className="grid max-h-[70vh] gap-3 overflow-y-auto py-1 text-sm">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  {t("notifications.colWorker")}
                </p>
                <Link
                  href={`/workers/${detailRow.worker.id}`}
                  className="font-semibold text-brand-navy hover:underline"
                >
                  {detailRow.worker.firstName} {detailRow.worker.lastName}
                </Link>
                <div className="text-xs text-slate-600">{detailRow.worker.email}</div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium uppercase text-slate-500">
                    {t("notifications.filterType")}
                  </p>
                  <Badge variant="outline" className={cn("mt-1 border text-xs", notificationTypeBadgeClass(detailRow.eventType))}>
                    {notificationTypeLabel(detailRow.eventType, t)}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase text-slate-500">{t("notifications.colStatus")}</p>
                  <Badge variant="outline" className={cn("mt-1 border", rowStatusBadgeClass(detailRow.status))}>
                    {notificationStatusDisplay(detailRow, t)}
                  </Badge>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-slate-500">
                  {t("notifications.tableReportDeadline")}
                </p>
                <p className="tabular-nums text-slate-800">
                  {new Date(detailRow.reportDeadlineAt ?? detailRow.dueDate).toLocaleString(localeTag)}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-slate-500">{t("notifications.idempotencyKey")}</p>
                <code className="mt-1 block rounded-md bg-slate-50 px-2 py-1.5 text-[11px] text-slate-800">
                  {detailRow.idempotencyKey}
                </code>
              </div>
              {detailRow.notes ? (
                <div>
                  <p className="text-xs font-medium uppercase text-slate-500">{t("events.labelNotes")}</p>
                  <p className="mt-1 whitespace-pre-wrap rounded-md border border-slate-100 bg-slate-50/90 p-2 text-sm text-slate-800">
                    {detailRow.notes}
                  </p>
                </div>
              ) : null}
              {detailRow.metadata != null &&
              typeof detailRow.metadata === "object" &&
              Object.keys(detailRow.metadata as object).length > 0 ? (
                <div>
                  <p className="text-xs font-medium uppercase text-slate-500">
                    {t("notifications.metadataJson")}
                  </p>
                  <pre className="mt-1 max-h-40 overflow-auto rounded-md border border-slate-100 bg-slate-50 p-2 text-[11px] text-slate-800">
                    {JSON.stringify(detailRow.metadata, null, 2)}
                  </pre>
                </div>
              ) : null}
              {(detailRow.status === "PENDING" || detailRow.status === "OVERDUE") && (
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setDetailRow(null)}>
                    {t("common.close")}
                  </Button>
                  <Button
                    type="button"
                    variant="success"
                    size="sm"
                    disabled={completingId === detailRow.id}
                    title={t("notifications.completeTooltip")}
                    onClick={() =>
                      void (async () => {
                        await complete(detailRow.id);
                        setDetailRow(null);
                      })()
                    }
                  >
                    {completingId === detailRow.id ? t("common.loading") : t("notifications.complete")}
                  </Button>
                </div>
              )}
              {detailRow.status !== "PENDING" && detailRow.status !== "OVERDUE" ? (
                <Button type="button" variant="outline" size="sm" onClick={() => setDetailRow(null)}>
                  {t("common.close")}
                </Button>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={deferTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeferTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("notifications.deferTitle")}</DialogTitle>
            <p className="text-sm text-slate-600">{t("notifications.deferSubtitle")}</p>
          </DialogHeader>
          {deferTarget ? (
            <div className="grid gap-4 py-1">
              <div className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2 text-sm">
                <span className="font-medium text-brand-navy">
                  {deferTarget.worker.firstName} {deferTarget.worker.lastName}
                </span>
                <div className="text-xs text-slate-600">{notificationTypeLabel(deferTarget.eventType, t)}</div>
              </div>
              <div className="space-y-2">
                <Label>{t("notifications.deferDays")}</Label>
                <Select value={String(deferDays)} onValueChange={(v) => setDeferDays(parseInt(v, 10))}>
                  <SelectTrigger className="h-11 border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEFER_DAY_OPTIONS.map((d) => (
                      <SelectItem key={d} value={String(d)}>
                        {d} {locale === "tr" ? "gün" : "days"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : null}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setDeferTarget(null)}>
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              disabled={deferringId !== null || !deferTarget}
              onClick={() =>
                void (async () => {
                  if (!deferTarget || !window.confirm(t("notifications.deferConfirm"))) return;
                  const ok = await deferNotification(deferTarget.id, deferDays);
                  if (ok) setDeferTarget(null);
                })()
              }
            >
              {deferringId ? t("common.loading") : t("notifications.deferSubmit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
