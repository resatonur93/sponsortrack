"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  ArrowRight,
  ArrowUpDown,
  BookOpen,
  Check,
  CheckCheck,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Clock,
  ExternalLink,
  Inbox,
  ListChecks,
  Loader2,
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
import {
  notificationSuggestedVaultFolder,
  documentsPageFolderQuery,
} from "@/lib/notifications/notification-vault-folder";

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

function isInboxUnread(row: Row): boolean {
  return row.readAt == null;
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

function vaultDocumentsHref(workerId: string, eventType: NotificationType): string {
  const folder = notificationSuggestedVaultFolder(eventType);
  const base = `/workers/${workerId}/documents`;
  return folder ? `${base}?${documentsPageFolderQuery(folder)}` : base;
}

export default function NotificationsPage(): JSX.Element {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const localeTag = locale === "tr" ? "tr-TR" : "en-GB";

  const [rows, setRows] = useState<Row[]>([]);
  const [status, setStatus] = useState<string>("all");
  const [type, setType] = useState<string>("all");
  const [readFilter, setReadFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [workflowRows, setWorkflowRows] = useState<WorkflowAssignmentRow[]>([]);
  const [workflowLoading, setWorkflowLoading] = useState(true);
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({
    key: "due",
    dir: "asc",
  });

  const [completingId, setCompletingId] = useState<string | null>(null);
  const [markingReadId, setMarkingReadId] = useState<string | null>(null);
  const [detailRow, setDetailRow] = useState<Row | null>(null);
  const [showAllMilestones, setShowAllMilestones] = useState(false);
  const [openByWorker, setOpenByWorker] = useState<Record<string, boolean>>({});

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
    if (showAllMilestones) q.set("all", "1");
    if (status !== "all") q.set("status", status);
    if (type !== "all") q.set("type", type);
    if (readFilter === "unread") q.set("unread", "1");
    else if (readFilter === "read") q.set("read", "1");

    const res = await fetch(`/api/notifications?${q.toString()}`, {
      credentials: "include",
    });
    if (!res.ok) return false;
    const json = (await res.json()) as { data: Row[] };
    setRows(json.data);
    return true;
  }, [status, type, readFilter, showAllMilestones]);

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

  useEffect(() => {
    setOpenByWorker((prev) => {
      const next = { ...prev };
      for (const g of groups) {
        if (next[g.workerId] === undefined) next[g.workerId] = true;
      }
      for (const k of Object.keys(next)) {
        if (!groups.some((g) => g.workerId === k)) delete next[k];
      }
      return next;
    });
  }, [groups]);

  function toggleWorkerGroup(workerId: string): void {
    setOpenByWorker((p) => ({ ...p, [workerId]: !p[workerId] }));
  }

  function toggleSort(key: SortKey): void {
    setSort((s) =>
      s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }
    );
  }

  function navigateToVault(row: Row): void {
    router.push(vaultDocumentsHref(row.worker.id, row.eventType));
  }

  async function markNotificationRead(rowId: string): Promise<void> {
    setMarkingReadId(rowId);
    try {
      let res = await fetch(`/api/notifications/${rowId}/read`, {
        method: "PUT",
        credentials: "include",
      });
      if (res.status === 405) {
        res = await fetch(`/api/notifications/${rowId}/read`, {
          method: "POST",
          credentials: "include",
        });
      }
      const json = (await res.json().catch(() => ({}))) as {
        data?: Row;
        error?: string;
      };
      if (!res.ok) {
        window.alert(
          [t("notifications.markReadFailed"), json.error].filter(Boolean).join("\n\n")
        );
        return;
      }
      const next = json.data;
      if (next) {
        setRows((prev) => prev.map((r) => (r.id === rowId ? next : r)));
        setDetailRow((d) =>
          d?.id === rowId ? { ...d, ...next, worker: next.worker ?? d.worker } : d
        );
      } else {
        await reloadNotifications();
      }
    } finally {
      setMarkingReadId(null);
    }
  }

  async function completeAndOpenVault(row: Row): Promise<void> {
    setCompletingId(row.id);
    try {
      const res = await fetch(`/api/notifications/${row.id}/complete`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        window.alert(t("notifications.completeFailed"));
      } else {
        await reloadNotifications();
      }
    } catch {
      window.alert(t("notifications.completeFailed"));
    } finally {
      router.push(vaultDocumentsHref(row.worker.id, row.eventType));
      setCompletingId(null);
      setDetailRow((d) => (d?.id === row.id ? null : d));
    }
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
        <CardContent className="grid gap-4 md:grid-cols-2 lg:max-w-4xl lg:grid-cols-3">
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
          <div className="space-y-2">
            <Label className="text-slate-700">{t("notifications.filterInboxRead")}</Label>
            <Select value={readFilter} onValueChange={setReadFilter}>
              <SelectTrigger className="h-11 border-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("notifications.inboxReadAll")}</SelectItem>
                <SelectItem value="unread">{t("notifications.inboxReadUnread")}</SelectItem>
                <SelectItem value="read">{t("notifications.inboxReadRead")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-start gap-3 md:col-span-2 lg:col-span-3">
            <input
              id="showAllMilestones"
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-navy accent-brand-navy focus:ring-brand-navy"
              checked={showAllMilestones}
              onChange={(e) => setShowAllMilestones(e.target.checked)}
            />
            <div className="min-w-0">
              <Label htmlFor="showAllMilestones" className="cursor-pointer font-medium text-slate-800">
                {t("notifications.showAllMilestones")}
              </Label>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                {t("notifications.daysBackHint")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-brand-navy/10 shadow-md ring-1 ring-slate-100">
        <CardHeader className="space-y-3 border-b border-slate-100 bg-slate-50/80 pb-4">
          <CardTitle className="text-lg text-brand-navy">{t("notifications.inboxGroupedTitle")}</CardTitle>
          <div className="flex flex-wrap gap-4 text-xs">
            <SortBtn
              label={t("notifications.colWorker")}
              active={sort.key === "worker"}
              onClick={() => toggleSort("worker")}
            />
            <SortBtn
              label={t("notifications.colNotificationType")}
              active={sort.key === "type"}
              onClick={() => toggleSort("type")}
            />
            <SortBtn
              label={t("notifications.tableReportDeadline")}
              active={sort.key === "due"}
              onClick={() => toggleSort("due")}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-3 p-4 sm:p-5">
          {loading ? (
            <p className="py-12 text-center text-sm text-slate-500">{t("common.loading")}</p>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-8 py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-brand-navy">
                <Inbox className="h-7 w-7 opacity-70" aria-hidden />
              </div>
              <p className="mt-4 text-base font-semibold text-brand-navy">
                {t("notifications.emptyStateTitle")}
              </p>
              <p className="mt-2 max-w-md text-sm text-slate-600">{t("notifications.emptyStateHint")}</p>
            </div>
          ) : (
            groups.map((g) => {
              const expanded = openByWorker[g.workerId] ?? true;
              const unreadCount = g.items.filter((x) => isInboxUnread(x)).length;
              return (
                <div
                  key={g.workerId}
                  className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm ring-1 ring-slate-100"
                >
                  <div className="flex items-stretch">
                    <button
                      type="button"
                      onClick={() => toggleWorkerGroup(g.workerId)}
                      className={cn(
                        "flex min-w-0 flex-1 items-center gap-3 p-4 text-left transition-colors hover:bg-slate-50/90",
                        unreadCount > 0 && expanded && "bg-amber-50/20"
                      )}
                    >
                      <ChevronDown
                        className={cn(
                          "h-5 w-5 shrink-0 text-slate-500 transition-transform duration-200",
                          expanded ? "rotate-180" : "rotate-0"
                        )}
                        aria-hidden
                      />
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-navy/10 text-sm font-bold uppercase text-brand-navy ring-2 ring-brand-navy/12">
                        {workerInitials(g.worker)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="truncate text-base font-semibold text-brand-navy">
                            {g.worker.firstName} {g.worker.lastName}
                          </span>
                          <Badge
                            variant="outline"
                            className="border-brand-navy/20 bg-brand-navy/[0.04] tabular-nums text-[11px] font-semibold text-brand-navy"
                          >
                            {g.items.length} {t("notifications.workerAlertsShort")}
                          </Badge>
                          {unreadCount > 0 ? (
                            <Badge
                              variant="outline"
                              className="border-amber-300 bg-amber-50 text-[11px] font-semibold text-amber-950"
                            >
                              {unreadCount} {t("notifications.unreadBadgeShort")}
                            </Badge>
                          ) : null}
                        </div>
                        <div className="truncate text-xs text-slate-500">{g.worker.email}</div>
                      </div>
                    </button>
                    <Link
                      href={`/workers/${g.worker.id}`}
                      title={t("notifications.workerProfile")}
                      className="flex shrink-0 items-center justify-center border-l border-slate-100 px-4 text-brand-navy transition-colors hover:bg-slate-50"
                    >
                      <ExternalLink className="h-4 w-4" aria-hidden />
                    </Link>
                  </div>
                  {expanded ? (
                    <div className="border-t border-slate-100">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader className="bg-slate-50/90">
                            <TableRow className="border-slate-200 hover:bg-transparent">
                              <TableHead className="min-w-[200px]">{t("notifications.colNotificationType")}</TableHead>
                              <TableHead className="w-[120px] whitespace-nowrap">
                                {t("notifications.inboxReadColumn")}
                              </TableHead>
                              <TableHead className="w-[110px]">{t("notifications.colStatus")}</TableHead>
                              <TableHead className="min-w-[140px]">{t("notifications.tableUrgency")}</TableHead>
                              <TableHead className="min-w-[120px]">
                                <span className="inline-flex flex-col gap-0.5">
                                  <SortBtn
                                    label={t("notifications.tableReportDeadline")}
                                    active={sort.key === "due"}
                                    onClick={() => toggleSort("due")}
                                  />
                                </span>
                              </TableHead>
                              <TableHead className="min-w-[200px] text-right">{t("notifications.colAction")}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {g.items.map((r) => (
                              <TableRow
                                key={r.id}
                                title={t("notifications.rowOpenVault")}
                                onClick={() => navigateToVault(r)}
                                className={cn(
                                  "cursor-pointer border-slate-100 transition-colors hover:bg-slate-50/85 active:bg-slate-100/70",
                                  isInboxUnread(r) && "bg-amber-50/35"
                                )}
                              >
                                <TableCell className="align-top">
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      "max-w-[280px] whitespace-normal text-left text-xs font-semibold leading-snug",
                                      notificationTypeBadgeClass(r.eventType)
                                    )}
                                  >
                                    {notificationTypeLabel(r.eventType, t)}
                                  </Badge>
                                  <div className="mt-1 max-w-[280px] text-[11px] leading-snug text-slate-500">
                                    {formatDeadlineWindowLabel(
                                      r.eventType,
                                      r.occurredAt,
                                      r.reportDeadlineAt ?? r.dueDate,
                                      locale
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="align-middle">
                                  {isInboxUnread(r) ? (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="h-8 gap-1 border-slate-200 text-xs transition-colors hover:border-brand-gold/50"
                                      disabled={markingReadId === r.id}
                                      title={t("notifications.markAsReadTooltip")}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        void markNotificationRead(r.id);
                                      }}
                                    >
                                      {markingReadId === r.id ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                                      ) : (
                                        <BookOpen className="h-3.5 w-3.5 opacity-90" aria-hidden />
                                      )}
                                      <span className="max-sm:sr-only">{t("notifications.markAsRead")}</span>
                                    </Button>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-md border border-slate-200/90 bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600">
                                      <CheckCheck className="h-3.5 w-3.5 text-slate-500" aria-hidden />
                                      {t("notifications.readConfirmed")}
                                    </span>
                                  )}
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
                                  {(r.reportDeadlineAt ?? r.dueDate) &&
                                    new Date(r.reportDeadlineAt ?? r.dueDate).toLocaleDateString(localeTag)}
                                </TableCell>
                                <TableCell className="align-top">
                                  <div className="flex flex-wrap justify-end gap-1.5">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="h-8 border-slate-200 px-2.5 transition-colors hover:border-brand-gold/60"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDetailRow(r);
                                      }}
                                    >
                                      {t("notifications.detail")}
                                    </Button>
                                    {(r.status === "PENDING" || r.status === "OVERDUE") && (
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="success"
                                        disabled={completingId === r.id}
                                        title={t("notifications.completeTooltip")}
                                        className="h-8 min-w-[108px] gap-1.5 px-2.5 font-semibold shadow-sm transition-all hover:shadow-md hover:brightness-[1.03] active:scale-[0.98]"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          void completeAndOpenVault(r);
                                        }}
                                      >
                                        {completingId === r.id ? (
                                          <>
                                            <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
                                            <span>{t("common.loading")}</span>
                                          </>
                                        ) : (
                                          <>
                                            <Check className="h-3.5 w-3.5 shrink-0" aria-hidden />
                                            <span>{t("notifications.complete")}</span>
                                            <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
                                          </>
                                        )}
                                      </Button>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

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
                <Link
                  href={vaultDocumentsHref(detailRow.worker.id, detailRow.eventType)}
                  className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-brand-navy hover:underline"
                >
                  <ArrowRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  {t("notifications.openDocumentVault")}
                </Link>
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
                <p className="text-xs font-medium uppercase text-slate-500">{t("notifications.inboxReadColumn")}</p>
                {isInboxUnread(detailRow) ? (
                  <p className="mt-1 text-sm text-slate-700">{t("notifications.detailUnreadHint")}</p>
                ) : (
                  <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-slate-600">
                    <CheckCheck className="h-4 w-4 text-slate-500" aria-hidden />
                    {t("notifications.readConfirmed")}
                  </p>
                )}
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
                  {isInboxUnread(detailRow) ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={markingReadId === detailRow.id}
                      title={t("notifications.markAsReadTooltip")}
                      className="gap-1.5"
                      onClick={() => void markNotificationRead(detailRow.id)}
                    >
                      {markingReadId === detailRow.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                      ) : (
                        <BookOpen className="h-3.5 w-3.5" aria-hidden />
                      )}
                      {t("notifications.markAsRead")}
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="success"
                    size="sm"
                    disabled={completingId === detailRow.id}
                    title={t("notifications.completeTooltip")}
                    className="gap-1.5 transition-all hover:shadow-md hover:brightness-[1.03] active:scale-[0.98]"
                    onClick={() => void completeAndOpenVault(detailRow)}
                  >
                    {completingId === detailRow.id ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                        {t("common.loading")}
                      </>
                    ) : (
                      <>
                        <Check className="h-3.5 w-3.5" aria-hidden />
                        {t("notifications.complete")}
                        <ExternalLink className="h-3.5 w-3.5 opacity-90" aria-hidden />
                      </>
                    )}
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

    </div>
  );
}
