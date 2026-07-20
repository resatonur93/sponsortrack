"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type {
  EventStatus,
  EventType,
  EventWorkflowState,
  Role,
  WorkflowStepStatus,
  WorkflowStepType,
} from "@prisma/client";
import { useSession } from "next-auth/react";
import { getActivePendingStep } from "@/lib/event-workflow-ui";
import { useTranslation } from "@/contexts/LanguageContext";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ManualComplianceEventSection } from "@/components/events/ManualComplianceEventSection";
import { EventQuickEditDialog } from "@/components/events/EventQuickEditDialog";
import { ClipboardList, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

const EVENT_TYPES: EventType[] = [
  "NO_SHOW_28_DAYS",
  "UNAUTHORISED_ABSENCE_10_DAYS",
  "REDUCED_PAY_ABSENCE",
  "SALARY_REDUCTION",
  "ROLE_CHANGE",
  "PROMOTION_SAME_CODE",
  "WORK_LOCATION_CHANGE",
  "SPONSORSHIP_ENDED",
  "OFFSHORE_ARRIVAL",
  "OFFSHORE_DEPARTURE",
  "ADDRESS_CHANGE",
  "PHONE_CHANGE",
  "EMAIL_CHANGE",
];

const EVENT_STATUSES: EventStatus[] = [
  "PENDING",
  "UNDER_REVIEW",
  "APPROVED",
  "REPORTED",
  "OVERDUE",
  "CANCELLED",
];

type EventRow = {
  id: string;
  eventType: EventType;
  eventDate: string;
  reportDeadline: string;
  status: EventStatus;
  workflowState: EventWorkflowState;
  workflowStepCount?: number;
  evidenceRequired: string[];
  smsDraft: string | null;
  notes: string | null;
  escalatedAt?: string | null;
  escalationNote?: string | null;
  worker: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    cosReference: string;
  };
};

type WorkflowStepRow = {
  id: string;
  step: WorkflowStepType;
  status: WorkflowStepStatus;
  assignedTo: string;
  assignee: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: Role;
  };
  actionedBy: string | null;
  actionedAt: string | null;
  notes: string | null;
  createdAt: string;
};

type EventDetailFull = EventRow & { workflowSteps: WorkflowStepRow[] };

function tEnum(
  translate: (key: string, fallback?: string) => string,
  key: string,
  fallback: string
): string {
  const v = translate(key, fallback);
  return v === key ? fallback : v;
}

function eventTypeDisplay(
  eventType: EventType,
  translate: (key: string, fallback?: string) => string
): string {
  return tEnum(translate, `events.eventType.${eventType}`, eventType);
}

function eventStatusDisplay(
  status: EventStatus,
  translate: (key: string, fallback?: string) => string
): string {
  return tEnum(translate, `events.status.${status}`, status);
}

function workflowStateDisplay(
  state: EventWorkflowState,
  translate: (key: string, fallback?: string) => string
): string {
  return tEnum(translate, `notifications.workflow.state.${state}`, state);
}

function workflowStepDisplay(
  step: WorkflowStepType,
  translate: (key: string, fallback?: string) => string
): string {
  return tEnum(translate, `notifications.workflow.step.${step}`, step);
}

function workflowStepStatusDisplay(
  status: WorkflowStepStatus,
  translate: (key: string, fallback?: string) => string
): string {
  return tEnum(translate, `notifications.workflow.stepStatus.${status}`, status);
}

function formatEventDate(iso: string, localeTag: string): string {
  return new Date(iso).toLocaleString(localeTag, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

type HoSmsDraft = {
  id: string;
  smsText: string;
  evidenceChecklist: string[];
  deadline: string;
  internalNotes: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  sentToHO: boolean;
  sentAt: string | null;
  createdAt: string;
  event: {
    id: string;
    eventType: EventType;
    worker: {
      id: string;
      firstName: string;
      lastName: string;
      cosReference: string;
    };
  };
};

export default function EventsPage(): JSX.Element {
  const { t, locale } = useTranslation();
  const localeTag = locale === "tr" ? "tr-TR" : "en-GB";
  const { data: session } = useSession();
  const me = session?.user;
  const [rows, setRows] = useState<EventRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<EventRow | null>(null);
  const [detailFull, setDetailFull] = useState<EventDetailFull | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [workflowNotes, setWorkflowNotes] = useState("");
  const [submitManagerId, setSubmitManagerId] = useState("");
  const [submitComplianceId, setSubmitComplianceId] = useState("");
  const [submitAoId, setSubmitAoId] = useState("");
  const [escalateUserId, setEscalateUserId] = useState("");

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [quickEditRow, setQuickEditRow] = useState<EventRow | null>(null);

  const [hoSmsEvent, setHoSmsEvent] = useState<EventRow | null>(null);
  const [hoSmsDraft, setHoSmsDraft] = useState<HoSmsDraft | null>(null);
  const [hoSmsPhase, setHoSmsPhase] = useState<"prepare" | "loading" | "review">(
    "prepare"
  );
  const [hoSmsNotes, setHoSmsNotes] = useState("");
  const [hoSmsBusy, setHoSmsBusy] = useState(false);
  const [hoSmsError, setHoSmsError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    const q = new URLSearchParams();
    if (statusFilter !== "all") q.set("status", statusFilter);
    if (typeFilter !== "all") q.set("eventType", typeFilter);
    if (dateFrom) q.set("dateFrom", dateFrom);
    if (dateTo) q.set("dateTo", dateTo);
    const res = await fetch(`/api/events?${q}`, { credentials: "include" });
    setLoading(false);
    if (!res.ok) {
      setError(t("events.listError"));
      return;
    }
    const json = (await res.json()) as { data: EventRow[] };
    setRows(json.data);
    setError(null);
  }, [statusFilter, typeFilter, dateFrom, dateTo, t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (typeof window === "undefined" || rows.length === 0) return;
    const hash = window.location.hash.replace(/^#/, "");
    const m = /^event-(.+)$/.exec(hash);
    if (!m?.[1]) return;
    const row = rows.find((r) => r.id === m[1]);
    if (row) setDetail(row);
  }, [rows]);

  useEffect(() => {
    if (!detail) {
      setDetailFull(null);
      return;
    }
    setDetailLoading(true);
    void (async () => {
      const res = await fetch(`/api/events/${detail.id}`, {
        credentials: "include",
        cache: "no-store",
      });
      setDetailLoading(false);
      if (res.ok) {
        const json = (await res.json()) as { data: EventDetailFull };
        setDetailFull(json.data);
      } else {
        setDetailFull({ ...detail, workflowSteps: [] });
      }
    })();
  }, [detail]);

  async function approve(id: string): Promise<void> {
    const res = await fetch(`/api/events/${id}/approve`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      alert(j.error ?? t("events.alertApproveFailed"));
      return;
    }
    void load();
    if (detail?.id === id) {
      const res2 = await fetch(`/api/events/${id}`, {
        credentials: "include",
        cache: "no-store",
      });
      if (res2.ok) {
        const json = (await res2.json()) as { data: EventDetailFull };
        setDetailFull(json.data);
        setDetail({
          id: json.data.id,
          eventType: json.data.eventType,
          eventDate: json.data.eventDate,
          reportDeadline: json.data.reportDeadline,
          status: json.data.status,
          workflowState: json.data.workflowState,
          workflowStepCount: json.data.workflowSteps?.length,
          evidenceRequired: json.data.evidenceRequired,
          smsDraft: json.data.smsDraft,
          notes: json.data.notes,
          worker: json.data.worker,
        });
      }
    }
  }

  async function report(id: string): Promise<void> {
    const res = await fetch(`/api/events/${id}/report`, {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) {
      alert(t("events.reportUpdateFailed"));
      return;
    }
    void load();
    setDetail(null);
  }

  async function reloadDetailAndList(): Promise<void> {
    void load();
    if (!detail) return;
    const res = await fetch(`/api/events/${detail.id}`, {
      credentials: "include",
      cache: "no-store",
    });
    if (res.ok) {
      const json = (await res.json()) as { data: EventDetailFull };
      setDetailFull(json.data);
      setDetail({
        id: json.data.id,
        eventType: json.data.eventType,
        eventDate: json.data.eventDate,
        reportDeadline: json.data.reportDeadline,
        status: json.data.status,
        workflowState: json.data.workflowState,
        workflowStepCount: json.data.workflowSteps?.length,
        evidenceRequired: json.data.evidenceRequired,
        smsDraft: json.data.smsDraft,
        notes: json.data.notes,
        worker: json.data.worker,
      });
    }
  }

  async function submitWorkflow(): Promise<void> {
    if (!detail) return;
    const res = await fetch(`/api/events/${detail.id}/submit`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        managerUserId: submitManagerId.trim() || null,
        complianceUserId: submitComplianceId.trim() || null,
        aoUserId: submitAoId.trim() || null,
        notes: workflowNotes.trim() || null,
      }),
    });
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      alert(j.error ?? t("events.alertSubmitFailed"));
      return;
    }
    setWorkflowNotes("");
    await reloadDetailAndList();
  }

  async function managerReview(): Promise<void> {
    if (!detail) return;
    const res = await fetch(`/api/events/${detail.id}/review`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: workflowNotes.trim() || null }),
    });
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      alert(j.error ?? t("events.alertReviewFailed"));
      return;
    }
    setWorkflowNotes("");
    await reloadDetailAndList();
  }

  async function complianceReview(): Promise<void> {
    if (!detail) return;
    const res = await fetch(`/api/events/${detail.id}/compliance-check`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: workflowNotes.trim() || null }),
    });
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      alert(j.error ?? t("events.alertComplianceFailed"));
      return;
    }
    setWorkflowNotes("");
    await reloadDetailAndList();
  }

  async function aoApproveDetail(): Promise<void> {
    if (!detail) return;
    const res = await fetch(`/api/events/${detail.id}/approve`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: workflowNotes.trim() || null }),
    });
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      alert(j.error ?? t("events.alertApproveFailed"));
      return;
    }
    setWorkflowNotes("");
    await reloadDetailAndList();
  }

  async function rejectWorkflow(): Promise<void> {
    if (!detail) return;
    if (!window.confirm(t("events.confirmReject"))) return;
    const res = await fetch(`/api/events/${detail.id}/reject`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: workflowNotes.trim() || null }),
    });
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      alert(j.error ?? t("events.alertRejectFailed"));
      return;
    }
    setWorkflowNotes("");
    await reloadDetailAndList();
  }

  async function escalateWorkflow(): Promise<void> {
    if (!detail || !escalateUserId.trim()) {
      alert(t("events.alertEscalateUserId"));
      return;
    }
    const res = await fetch(`/api/events/${detail.id}/escalate`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assignToUserId: escalateUserId.trim(),
        notes: workflowNotes.trim() || null,
      }),
    });
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      alert(j.error ?? t("events.alertEscalateFailed"));
      return;
    }
    setWorkflowNotes("");
    setEscalateUserId("");
    await reloadDetailAndList();
  }

  async function escalateExternal(): Promise<void> {
    if (!detail) return;
    const res = await fetch(`/api/events/${detail.id}/escalate-external`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: workflowNotes.trim() || null }),
    });
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      alert(j.error ?? t("events.alertEscalateExternalFailed"));
      return;
    }
    setWorkflowNotes("");
    await reloadDetailAndList();
  }

  function openHoSmsModal(row: EventRow): void {
    setHoSmsEvent(row);
    setHoSmsDraft(null);
    setHoSmsPhase("prepare");
    setHoSmsNotes("");
    setHoSmsError(null);
  }

  function closeHoSmsModal(): void {
    setHoSmsEvent(null);
    setHoSmsDraft(null);
    setHoSmsPhase("prepare");
    setHoSmsNotes("");
    setHoSmsError(null);
  }

  async function generateHoSmsDraft(): Promise<void> {
    if (!hoSmsEvent) return;
    setHoSmsPhase("loading");
    setHoSmsError(null);
    try {
      const res = await fetch(`/api/events/${hoSmsEvent.id}/generate-sms`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          internalNotes: hoSmsNotes.trim() || null,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        data?: HoSmsDraft;
        error?: string;
      };
      if (!res.ok) {
        setHoSmsError(json.error ?? t("events.alertSmsDraftFailed"));
        setHoSmsPhase("prepare");
        return;
      }
      if (json.data) {
        setHoSmsDraft(json.data);
        setHoSmsPhase("review");
        void load();
      }
    } finally {
      /* phase set above */
    }
  }

  async function approveHoSmsDraft(): Promise<void> {
    if (!hoSmsDraft) return;
    setHoSmsBusy(true);
    setHoSmsError(null);
    try {
      const res = await fetch(`/api/sms-drafts/${hoSmsDraft.id}/approve`, {
        method: "PUT",
        credentials: "include",
      });
      const json = (await res.json().catch(() => ({}))) as {
        data?: HoSmsDraft;
        error?: string;
      };
      if (!res.ok) {
        setHoSmsError(json.error ?? t("events.alertSmsApproveFailed"));
        return;
      }
      if (json.data) setHoSmsDraft(json.data);
    } finally {
      setHoSmsBusy(false);
    }
  }

  async function markHoSmsSent(): Promise<void> {
    if (!hoSmsDraft) return;
    setHoSmsBusy(true);
    setHoSmsError(null);
    try {
      const res = await fetch(`/api/sms-drafts/${hoSmsDraft.id}/mark-sent`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = (await res.json().catch(() => ({}))) as {
        data?: HoSmsDraft;
        error?: string;
      };
      if (!res.ok) {
        setHoSmsError(json.error ?? t("events.alertSmsUpdateFailed"));
        return;
      }
      if (json.data) setHoSmsDraft(json.data);
    } finally {
      setHoSmsBusy(false);
    }
  }

  async function deleteEvent(row: EventRow): Promise<void> {
    if (!window.confirm(t("events.deleteConfirm"))) return;
    const res = await fetch(`/api/events/${row.id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!res.ok) {
      alert(t("events.deleteFailed"));
      return;
    }
    void load();
    if (detail?.id === row.id) setDetail(null);
    setQuickEditRow(null);
  }

  if (error) {
    return <p className="text-rose-600">{error}</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-navy">{t("events.title")}</h1>
        <p className="text-sm text-slate-600">{t("events.subtitle")}</p>
      </div>

      <Card className="overflow-hidden border-slate-200/90 shadow-md ring-1 ring-slate-100">
        <CardHeader className="border-b border-slate-100 bg-slate-50/70">
          <CardTitle className="text-lg text-brand-navy">{t("events.filters")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 pt-6 sm:grid-cols-2 lg:grid-cols-12 lg:items-end">
          <div className="space-y-2 lg:col-span-3">
            <Label>{t("events.filterStatus")}</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-11 border-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all")}</SelectItem>
                {EVENT_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {eventStatusDisplay(s, t)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 lg:col-span-4">
            <Label>{t("events.filterEventType")}</Label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-11 border-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all")}</SelectItem>
                {EVENT_TYPES.map((et) => (
                  <SelectItem key={et} value={et}>
                    {eventTypeDisplay(et, t)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 lg:col-span-2">
            <Label>{t("events.dateFrom")}</Label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-11 border-slate-200"
            />
          </div>
          <div className="space-y-2 lg:col-span-2">
            <Label>{t("events.dateTo")}</Label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-11 border-slate-200"
            />
          </div>
          <div className="flex lg:col-span-1">
            <Button
              type="button"
              className="h-11 w-full shrink-0 font-semibold lg:w-auto"
              onClick={() => void load()}
              disabled={loading}
            >
              {t("common.apply")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <ManualComplianceEventSection onCreated={() => void load()} />

      <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-md ring-1 ring-slate-100">
        <Table>
          <TableHeader className="sticky top-0 z-[1] bg-slate-50/95 backdrop-blur">
            <TableRow className="border-slate-200 hover:bg-transparent">
              <TableHead>{t("events.colType")}</TableHead>
              <TableHead>{t("events.colWorker")}</TableHead>
              <TableHead>{t("events.colEventDate")}</TableHead>
              <TableHead>{t("events.colDeadline")}</TableHead>
              <TableHead>{t("events.colStatus")}</TableHead>
              <TableHead>{t("events.colWorkflow")}</TableHead>
              <TableHead className="text-right">{t("events.colActions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="py-14 text-center text-sm text-slate-500">
                  {t("common.loading")}
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="p-0">
                  <div className="flex flex-col items-center px-8 py-16 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-brand-navy">
                      <ClipboardList className="h-7 w-7 opacity-70" aria-hidden />
                    </div>
                    <p className="mt-4 text-base font-semibold text-brand-navy">
                      {t("events.emptyStateTitle")}
                    </p>
                    <p className="mt-2 max-w-md text-sm text-slate-600">
                      {t("events.emptyStateHint")}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow
                  key={r.id}
                  id={`event-${r.id}`}
                  className="border-slate-100 transition-colors hover:bg-slate-50/80"
                >
                  <TableCell className="align-top font-medium">
                    <span className="line-clamp-2 text-sm leading-snug text-slate-900">
                      {eventTypeDisplay(r.eventType, t)}
                    </span>
                  </TableCell>
                  <TableCell className="align-top">
                    <div className="flex gap-3">
                      <Link
                        href={`/workers/${r.worker.id}`}
                        className="flex shrink-0 items-center justify-center rounded-full bg-brand-navy/10 h-10 w-10 text-xs font-bold text-brand-navy ring-2 ring-brand-navy/15 hover:bg-brand-navy/20"
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
                        <div className="font-mono text-[10px] text-slate-500">
                          {r.worker.cosReference}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap align-top text-sm tabular-nums text-slate-800">
                    {formatEventDate(r.eventDate, localeTag)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap align-top text-sm tabular-nums text-slate-700">
                    {formatEventDate(r.reportDeadline, localeTag)}
                  </TableCell>
                  <TableCell className="align-top">
                    <Badge
                      variant={statusVariant(r.status)}
                      className={cn("text-[11px] font-bold", statusBadgeClass(r.status))}
                    >
                      {eventStatusDisplay(r.status, t)}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[150px] align-top">
                    <Badge
                      variant="outline"
                      className="border-slate-200 bg-white text-[10px] font-semibold uppercase leading-snug text-slate-700"
                    >
                      {workflowStateDisplay(r.workflowState, t)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right align-top">
                    <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
                      <Button
                        type="button"
                        size="sm"
                        variant="default"
                        className="gap-1.5 font-semibold"
                        onClick={() => setDetail(r)}
                      >
                        {t("events.details")}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="gap-1.5 border-slate-200"
                        onClick={() => setQuickEditRow(r)}
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden />
                        {t("events.actionEdit")}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="gap-1.5 border-rose-200 text-rose-700 hover:bg-rose-50"
                        onClick={() => void deleteEvent(r)}
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden />
                        {t("events.actionDelete")}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="text-xs font-medium"
                        onClick={() => openHoSmsModal(r)}
                      >
                        {t("events.generateSms")}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="text-xs"
                        disabled={
                          r.status === "CANCELLED" ||
                          r.status === "REPORTED" ||
                          r.status === "APPROVED" ||
                          !(
                            r.workflowState === "AO_APPROVAL" ||
                            ((r.workflowStepCount ?? 0) === 0 &&
                              me?.role === "AUTHORISING_OFFICER" &&
                              r.workflowState !== "DRAFT")
                          )
                        }
                        onClick={() => void approve(r.id)}
                      >
                        {t("events.approve")}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="text-xs"
                        disabled={
                          r.status === "CANCELLED" ||
                          r.status === "REPORTED" ||
                          !(
                            r.status === "APPROVED" &&
                            r.workflowState === "REPORTED"
                          )
                        }
                        onClick={() => void report(r.id)}
                      >
                        {t("events.report")}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <EventQuickEditDialog
        open={quickEditRow !== null}
        onOpenChange={(o) => {
          if (!o) setQuickEditRow(null);
        }}
        target={
          quickEditRow
            ? { id: quickEditRow.id, status: quickEditRow.status, notes: quickEditRow.notes }
            : null
        }
        dialogTitle={t("events.quickEditTitle")}
        statusFieldLabel={t("events.fieldStatus")}
        labelNotes={t("events.labelNotes")}
        placeholderNotes={t("events.workflowNotesPlaceholder")}
        saveLabel={t("events.saveChanges")}
        cancelLabel={t("common.cancel")}
        savingLabel={t("events.saving")}
        saveFailedLabel={t("events.reportUpdateFailed")}
        statusLabel={(s) => eventStatusDisplay(s, t)}
        onSaved={() => void load()}
      />

      {detail ? (
        <Card className="border-brand-navy/30">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">{t("events.detailTitle")}</CardTitle>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                if (typeof window !== "undefined" && detail) {
                  const h = window.location.hash.replace(/^#/, "");
                  if (h === `event-${detail.id}`) {
                    window.history.replaceState(
                      null,
                      "",
                      window.location.pathname + window.location.search
                    );
                  }
                }
                setDetail(null);
              }}
            >
              {t("common.close")}
            </Button>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {detailLoading ? (
              <p className="text-slate-500">{t("events.loadingWorkflow")}</p>
            ) : null}
            <p>
              <span className="text-slate-500">{t("events.labelType")}:</span>{" "}
              {eventTypeDisplay(detail.eventType, t)}
            </p>
            <p>
              <span className="text-slate-500">{t("events.labelWorkflow")}:</span>{" "}
              <Badge variant="outline">
                {workflowStateDisplay(detailFull?.workflowState ?? detail.workflowState, t)}
              </Badge>
            </p>
            <p>
              <span className="text-slate-500">{t("events.labelWorker")}:</span>{" "}
              <Link href={`/workers/${detail.worker.id}`} className="underline">
                {detail.worker.firstName} {detail.worker.lastName}
              </Link>{" "}
              · {detail.worker.cosReference}
            </p>
            {detailFull?.workflowSteps?.length ? (
              <div>
                <p className="font-medium text-slate-800">{t("events.timelineTitle")}</p>
                <ul className="relative mt-2 space-y-0 border-l-2 border-slate-200 pl-4">
                  {detailFull.workflowSteps.map((s) => (
                    <li key={s.id} className="relative pb-4 last:pb-0">
                      <span className="absolute -left-[7px] top-1 h-3 w-3 rounded-full border-2 border-white bg-brand-navy" />
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">
                          {workflowStepDisplay(s.step, t)}
                        </span>
                        <Badge variant="outline">
                          {workflowStepStatusDisplay(s.status, t)}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-600">
                        {t("events.assignedTo")}: {s.assignee.firstName}{" "}
                        {s.assignee.lastName} ({s.assignee.email})
                      </p>
                      {s.actionedAt ? (
                        <p className="text-xs text-slate-500">
                          {t("events.actionedAt")}:{" "}
                          {new Date(s.actionedAt).toLocaleString(localeTag)}
                        </p>
                      ) : null}
                      {s.notes ? (
                        <p className="text-xs text-slate-600">{s.notes}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {me?.id &&
            detailFull?.workflowSteps?.length &&
            getActivePendingStep(detailFull.workflowSteps)?.assignedTo === me.id ? (
              <p className="rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-900">
                {t("events.actionRequired")}
              </p>
            ) : null}
            <div>
              <Label className="text-slate-600">{t("events.workflowNotes")}</Label>
              <textarea
                className="mt-1 min-h-[72px] w-full rounded-md border border-slate-300 p-2 text-sm"
                value={workflowNotes}
                onChange={(e) => setWorkflowNotes(e.target.value)}
                placeholder={t("events.workflowNotesPlaceholder")}
              />
            </div>
            <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
              {detail.workflowState === "DRAFT" ? (
                <>
                  <div className="w-full space-y-1">
                    <Label className="text-xs">{t("events.managerUserId")}</Label>
                    <Input
                      value={submitManagerId}
                      onChange={(e) => setSubmitManagerId(e.target.value)}
                      placeholder={t("events.managerUserIdPlaceholder")}
                      className="text-xs"
                    />
                  </div>
                  <div className="w-full space-y-1">
                    <Label className="text-xs">{t("events.complianceUserId")}</Label>
                    <Input
                      value={submitComplianceId}
                      onChange={(e) => setSubmitComplianceId(e.target.value)}
                      className="text-xs"
                    />
                  </div>
                  <div className="w-full space-y-1">
                    <Label className="text-xs">{t("events.aoUserId")}</Label>
                    <Input
                      value={submitAoId}
                      onChange={(e) => setSubmitAoId(e.target.value)}
                      className="text-xs"
                    />
                  </div>
                  <Button type="button" size="sm" onClick={() => void submitWorkflow()}>
                    {t("events.submitHr")}
                  </Button>
                </>
              ) : null}
              {detail.workflowState === "SUBMITTED" ? (
                <Button type="button" size="sm" onClick={() => void managerReview()}>
                  {t("events.managerApprove")}
                </Button>
              ) : null}
              {detail.workflowState === "COMPLIANCE_REVIEW" ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void complianceReview()}
                >
                  {t("events.complianceApprove")}
                </Button>
              ) : null}
              {detail.workflowState === "AO_APPROVAL" ? (
                <Button type="button" size="sm" onClick={() => void aoApproveDetail()}>
                  {t("events.aoFinalApprove")}
                </Button>
              ) : null}
              {detail.workflowState !== "DRAFT" &&
              detail.workflowState !== "REPORTED" ? (
                <>
                  <Button
                    type="button"
                    size="sm"
                    variant="danger"
                    onClick={() => void rejectWorkflow()}
                  >
                    {t("events.reject")}
                  </Button>
                  <div className="flex w-full flex-wrap items-end gap-2">
                    <div className="min-w-[200px] flex-1 space-y-1">
                      <Label className="text-xs">{t("events.escalateToUserId")}</Label>
                      <Input
                        value={escalateUserId}
                        onChange={(e) => setEscalateUserId(e.target.value)}
                        placeholder={t("events.placeholderCuidShort")}
                        className="text-xs"
                      />
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => void escalateWorkflow()}
                    >
                      {t("events.escalate")}
                    </Button>
                  </div>
                </>
              ) : null}
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => void escalateExternal()}
              >
                {t("events.escalateExternal")}
              </Button>
            </div>
            {detail.escalatedAt ? (
              <p className="text-xs text-amber-800">
                {t("events.escalatedExternalNotice")}
              </p>
            ) : null}
            <div>
              <p className="text-slate-500">{t("events.evidenceRequired")}</p>
              <ul className="mt-1 list-inside list-disc">
                {detail.evidenceRequired.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </div>
            {detail.smsDraft ? (
              <div>
                <p className="text-slate-500">{t("events.smsDraft")}</p>
                <pre className="mt-1 whitespace-pre-wrap rounded bg-slate-50 p-3 text-xs">
                  {detail.smsDraft}
                </pre>
              </div>
            ) : null}
            {detail.notes ? (
              <p>
                <span className="text-slate-500">{t("events.labelNotes")}:</span>{" "}
                {detail.notes}
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <Dialog
        open={hoSmsEvent !== null}
        onOpenChange={(open) => {
          if (!open) closeHoSmsModal();
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("events.dialogHoSmsTitle")}</DialogTitle>
          </DialogHeader>
          {hoSmsEvent ? (
            <div className="space-y-4 text-sm">
              <p className="text-slate-600">
                <span className="font-medium text-slate-800">
                  {t("events.dialogEventLabel")}:
                </span>{" "}
                {eventTypeDisplay(hoSmsEvent.eventType, t)} ·{" "}
                {hoSmsEvent.worker.firstName}{" "}
                {hoSmsEvent.worker.lastName} ({hoSmsEvent.worker.cosReference})
              </p>
              {hoSmsError ? (
                <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-red-800">
                  {hoSmsError}
                </p>
              ) : null}

              {hoSmsPhase === "prepare" ? (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label>{t("events.dialogInternalNotes")}</Label>
                    <textarea
                      value={hoSmsNotes}
                      onChange={(e) => setHoSmsNotes(e.target.value)}
                      placeholder={t("events.dialogInternalNotesPlaceholder")}
                      className="min-h-[80px] w-full rounded-md border border-slate-300 p-2 text-sm"
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={() => void generateHoSmsDraft()}
                  >
                    {t("events.dialogGenerateDraft")}
                  </Button>
                </div>
              ) : null}

              {hoSmsPhase === "loading" ? (
                <p className="text-slate-500">{t("events.dialogGenerating")}</p>
              ) : null}

              {hoSmsPhase === "review" && hoSmsDraft ? (
                <div className="space-y-4 border-t border-slate-100 pt-4">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      {t("events.dialogReviewSms")}
                    </p>
                    <pre className="mt-2 whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900">
                      {hoSmsDraft.smsText}
                    </pre>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      {t("events.dialogEvidenceChecklist")}
                    </p>
                    <ul className="mt-2 list-inside list-disc text-slate-700">
                      {hoSmsDraft.evidenceChecklist.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">
                      {t("events.dialogDeadline")}:{" "}
                      {formatEventDate(hoSmsDraft.deadline, localeTag)}
                    </Badge>
                    {hoSmsDraft.approvedAt ? (
                      <Badge variant="success">{t("events.badgeApproved")}</Badge>
                    ) : (
                      <Badge variant="warning">
                        {t("events.badgeAwaitingApproval")}
                      </Badge>
                    )}
                    {hoSmsDraft.sentToHO ? (
                      <Badge variant="success">{t("events.badgeSentToHo")}</Badge>
                    ) : null}
                  </div>
                  {hoSmsDraft.internalNotes ? (
                    <p className="text-xs text-slate-600">
                      <span className="font-medium">
                        {t("events.internalNotesColon")}:
                      </span>{" "}
                      {hoSmsDraft.internalNotes}
                    </p>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    {!hoSmsDraft.approvedAt ? (
                      <Button
                        type="button"
                        disabled={hoSmsBusy}
                        onClick={() => void approveHoSmsDraft()}
                      >
                        {t("events.approveDraft")}
                      </Button>
                    ) : null}
                    {hoSmsDraft.approvedAt && !hoSmsDraft.sentToHO ? (
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={hoSmsBusy}
                        onClick={() => void markHoSmsSent()}
                      >
                        {t("events.markSentToHo")}
                      </Button>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function workerInitials(worker: EventRow["worker"]): string {
  return `${worker.firstName?.[0] ?? ""}${worker.lastName?.[0] ?? ""}`.toUpperCase() || "?";
}

function statusBadgeClass(s: EventStatus): string {
  switch (s) {
    case "PENDING":
      return "shadow-sm ring-2 ring-amber-400/55";
    case "UNDER_REVIEW":
      return "shadow-sm ring-2 ring-sky-400/50";
    case "APPROVED":
      return "shadow-sm ring-2 ring-brand-navy/25";
    case "REPORTED":
      return "shadow-sm ring-2 ring-emerald-400/50";
    case "OVERDUE":
      return "shadow-sm ring-2 ring-red-500/60";
    case "CANCELLED":
      return "opacity-75";
    default:
      return "";
  }
}

function statusVariant(
  s: EventStatus
): "success" | "warning" | "danger" | "outline" | "default" {
  switch (s) {
    case "REPORTED":
      return "success";
    case "OVERDUE":
      return "danger";
    case "APPROVED":
      return "default";
    case "CANCELLED":
      return "outline";
    case "UNDER_REVIEW":
      return "warning";
    default:
      return "warning";
  }
}
