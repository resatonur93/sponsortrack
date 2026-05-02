"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import type { AlertLevel, AlertType } from "@prisma/client";
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
import { useTranslation } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import {
  alertLevelIconWrapClass,
  alertLevelRingClass,
  alertLevelSummarySurfaceClass,
  alertLevelTableBadgeClass,
  alertTypeIcon,
  alertTypeIconTintClass,
} from "@/lib/alerts/display";
import {
  AlertTriangle,
  Bell,
  BellOff,
  Check,
  Eye,
  Flame,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Wrench,
  Zap,
} from "lucide-react";

const LEVELS: AlertLevel[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

type AlertRow = {
  id: string;
  alertType: AlertType;
  level: AlertLevel;
  message: string;
  isRead: boolean;
  dismissedAt: string | null;
  createdAt: string;
  worker: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
};

function tEnum(
  translate: (key: string, fallback?: string) => string,
  key: string,
  fallback: string
): string {
  const v = translate(key, fallback);
  return v === key ? fallback : v;
}

function alertTypeDisplay(
  alertType: AlertType,
  translate: (key: string, fallback?: string) => string
): string {
  return tEnum(translate, `alerts.type.${alertType}`, alertType);
}

function alertLevelLabel(
  level: AlertLevel,
  translate: (key: string, fallback?: string) => string
): string {
  return tEnum(translate, `alerts.level.${level}`, level);
}

function workerInitials(worker: NonNullable<AlertRow["worker"]>): string {
  return `${worker.firstName?.[0] ?? ""}${worker.lastName?.[0] ?? ""}`.toUpperCase() || "?";
}

function fillSeedMessage(template: string, alerts: number, events: number): string {
  return template.replace("{alerts}", String(alerts)).replace("{events}", String(events));
}

function fillPipelineSuccess(template: string, upserts: number, visa: number): string {
  return template.replace("{upserts}", String(upserts)).replace("{visa}", String(visa));
}

function levelSummaryIcon(level: AlertLevel): typeof Flame {
  switch (level) {
    case "CRITICAL":
      return Flame;
    case "HIGH":
      return Zap;
    case "MEDIUM":
      return AlertTriangle;
    case "LOW":
      return ShieldCheck;
    default:
      return AlertTriangle;
  }
}

export default function AlertsPage(): JSX.Element {
  const { t, locale } = useTranslation();
  const { data: session } = useSession();
  const localeTag = locale === "tr" ? "tr-TR" : "en-GB";

  const [rows, setRows] = useState<AlertRow[]>([]);
  const [meta, setMeta] = useState<{
    unreadCount: number;
    totalActive?: number;
    byLevel: Record<string, number>;
    byLevelUnread?: Record<string, number>;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [readFilter, setReadFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [detailRow, setDetailRow] = useState<AlertRow | null>(null);
  const [seedLoading, setSeedLoading] = useState(false);
  const [seedBanner, setSeedBanner] = useState<string | null>(null);
  const [pipelineNotice, setPipelineNotice] = useState<string | null>(null);
  const [pipelineBusy, setPipelineBusy] = useState(false);
  const [prepBusy, setPrepBusy] = useState(false);

  const canSeedSample =
    !!session?.user && session.user.role !== "LEVEL_2_USER";

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    const q = new URLSearchParams();
    if (levelFilter !== "all") q.set("level", levelFilter);
    if (readFilter === "unread") q.set("isRead", "false");
    if (readFilter === "read") q.set("isRead", "true");
    if (dateFrom.trim()) q.set("from", dateFrom.trim());
    if (dateTo.trim()) q.set("to", dateTo.trim());
    q.set("limit", "200");
    const res = await fetch(`/api/alerts?${q}`, {
      credentials: "include",
      cache: "no-store",
    });
    setLoading(false);
    if (!res.ok) {
      setError(t("common.errorLoad"));
      return;
    }
    const json = (await res.json()) as {
      data: AlertRow[];
      meta: {
        unreadCount: number;
        totalActive?: number;
        byLevel: Record<string, number>;
        byLevelUnread?: Record<string, number>;
      };
    };
    setRows(json.data);
    setMeta(json.meta);
    setError(null);
  }, [levelFilter, readFilter, dateFrom, dateTo, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalFromMeta = useMemo(() => {
    if (!meta?.byLevel) return 0;
    return LEVELS.reduce((acc, l) => acc + (meta.byLevel[l] ?? 0), 0);
  }, [meta]);

  const displayTotal = meta?.totalActive ?? totalFromMeta;

  function onLevelCardClick(lv: AlertLevel): void {
    if (levelFilter === lv && readFilter === "all") {
      setLevelFilter("all");
    } else {
      setLevelFilter(lv);
      setReadFilter("all");
    }
  }

  function onUnreadCardClick(): void {
    if (readFilter === "unread" && levelFilter === "all") {
      setReadFilter("all");
    } else {
      setReadFilter("unread");
      setLevelFilter("all");
    }
  }

  async function markRead(id: string): Promise<boolean> {
    const res = await fetch(`/api/alerts/${id}/read`, {
      method: "PUT",
      credentials: "include",
    });
    if (res.ok) {
      void load();
      return true;
    }
    window.alert(t("alerts.markReadFailed"));
    return false;
  }

  async function dismiss(id: string): Promise<void> {
    const res = await fetch(`/api/alerts/${id}/dismiss`, {
      method: "PUT",
      credentials: "include",
    });
    if (res.ok) void load();
    else window.alert(t("alerts.dismissFailed"));
  }

  async function runPrepDemoDates(): Promise<void> {
    setPrepBusy(true);
    setPipelineNotice(null);
    try {
      const res = await fetch("/api/alerts/prep-demo-dates", {
        method: "POST",
        credentials: "include",
      });
      const json = (await res.json()) as { ok?: boolean; error?: string; workerIds?: string[] };
      if (!res.ok) {
        window.alert(json.error ?? t("alerts.prepFailed"));
        return;
      }
      const n = json.workerIds?.length ?? 0;
      setPipelineNotice(t("alerts.prepOk").replace("{n}", String(n)));
    } finally {
      setPrepBusy(false);
    }
  }

  async function runAlertsPipelineNow(): Promise<void> {
    setPipelineBusy(true);
    setPipelineNotice(null);
    try {
      const res = await fetch("/api/cron/process-alerts", {
        method: "POST",
        credentials: "include",
      });
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        result?: {
          escalation?: { upserts?: number };
          daily?: { visaEventsCreated?: number };
        };
      };
      if (!res.ok) {
        window.alert(json.error ?? t("alerts.pipelineFailed"));
        return;
      }
      const upserts = json.result?.escalation?.upserts ?? 0;
      const visa = json.result?.daily?.visaEventsCreated ?? 0;
      setPipelineNotice(fillPipelineSuccess(t("alerts.pipelineSuccess"), upserts, visa));
      void load();
    } finally {
      setPipelineBusy(false);
    }
  }

  async function runSeedSample(): Promise<void> {
    setSeedLoading(true);
    setSeedBanner(null);
    try {
      const res = await fetch("/api/alerts/seed", {
        method: "POST",
        credentials: "include",
      });
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        alertsCreated?: number;
        notificationEventsCreated?: number;
        warnings?: string[];
      };
      if (!res.ok) {
        window.alert(json.error ?? t("alerts.seedFailed"));
        return;
      }
      const base = fillSeedMessage(
        t("alerts.seedSuccess"),
        json.alertsCreated ?? 0,
        json.notificationEventsCreated ?? 0
      );
      const warn = json.warnings?.filter(Boolean).join(" ");
      setSeedBanner(warn ? `${base} ${warn}` : base);
      void load();
    } finally {
      setSeedLoading(false);
    }
  }

  function confirmDismiss(id: string): void {
    if (typeof window !== "undefined" && window.confirm(t("alerts.dismissConfirm"))) {
      void dismiss(id);
    }
  }

  function formatCreated(iso: string): string {
    return new Date(iso).toLocaleString(localeTag, {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (error) {
    return (
      <div className="space-y-3">
        <p className="text-red-600">{error}</p>
        <Button type="button" variant="outline" onClick={() => void load()}>
          {t("common.retry")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-brand-navy md:text-3xl">
          {t("alerts.title")}
        </h1>
        <p className="max-w-2xl text-sm text-slate-600">{t("alerts.subtitle")}</p>
        {canSeedSample ? (
          <div className="max-w-3xl space-y-2 rounded-lg border border-dashed border-brand-navy/25 bg-slate-50/90 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">
              {t("alerts.devToolsTitle")}
            </p>
            <p className="text-xs text-slate-600">{t("alerts.prepDemoHint")}</p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 gap-1.5"
                disabled={prepBusy || pipelineBusy}
                onClick={() => void runPrepDemoDates()}
              >
                <Wrench className={cn("h-3.5 w-3.5", prepBusy && "animate-pulse")} aria-hidden />
                {t("alerts.prepDemoDates")}
              </Button>
              <Button
                type="button"
                variant="default"
                size="sm"
                className="h-9 gap-1.5"
                disabled={pipelineBusy || prepBusy}
                onClick={() => void runAlertsPipelineNow()}
              >
                <RefreshCw className={cn("h-3.5 w-3.5", pipelineBusy && "animate-spin")} aria-hidden />
                {t("alerts.computePipeline")}
              </Button>
            </div>
            <p className="text-[11px] text-slate-500">{t("alerts.computePipelineHint")}</p>
          </div>
        ) : null}
        {seedBanner ? (
          <p className="max-w-2xl rounded-lg border border-emerald-200 bg-emerald-50/90 px-3 py-2 text-sm text-emerald-950">
            {seedBanner}
          </p>
        ) : null}
        {pipelineNotice ? (
          <p className="max-w-2xl rounded-lg border border-sky-200 bg-sky-50/90 px-3 py-2 text-sm text-sky-950">
            {pipelineNotice}
          </p>
        ) : null}
        {meta ? (
          <p className="text-sm font-medium text-brand-navy">
            {t("alerts.totalActive")}:{" "}
            <span className="tabular-nums text-slate-900">{displayTotal}</span>
            {meta.unreadCount > 0 ? (
              <span className="ml-2 font-normal text-slate-500">
                · {meta.unreadCount} {t("alerts.unreadWord")}
              </span>
            ) : null}
          </p>
        ) : null}
      </div>

      {meta ? (
        <div className="space-y-2">
          <p className="text-xs text-slate-500">{t("alerts.summaryFilterHint")}</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {LEVELS.map((lv) => {
              const Icon = levelSummaryIcon(lv);
              const count = meta.byLevel[lv] ?? 0;
              const unreadhere = meta.byLevelUnread?.[lv] ?? 0;
              const active = levelFilter === lv && readFilter === "all";
              return (
                <button
                  key={lv}
                  type="button"
                  onClick={() => onLevelCardClick(lv)}
                  className={cn(
                    "flex flex-col gap-2 rounded-xl border p-4 text-left transition-all",
                    alertLevelSummarySurfaceClass(lv),
                    alertLevelRingClass(lv),
                    active && "ring-offset-2 ring-offset-white",
                    active && "scale-[1.02]"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-lg",
                        alertLevelIconWrapClass(lv)
                      )}
                    >
                      <Icon className="h-5 w-5 shrink-0" aria-hidden />
                    </span>
                    <span className="text-2xl font-bold tabular-nums text-brand-navy">{count}</span>
                  </div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-700">
                    {alertLevelLabel(lv, t)}
                  </div>
                  {unreadhere > 0 ? (
                    <div className="text-[11px] font-medium text-red-700">
                      {unreadhere} {t("alerts.unreadWord")}
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-500">—</div>
                  )}
                </button>
              );
            })}
            <button
              type="button"
              onClick={onUnreadCardClick}
              className={cn(
                "flex flex-col gap-2 rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 text-left shadow-sm ring-2 ring-slate-200/80 transition-all",
                readFilter === "unread" && levelFilter === "all" && "ring-brand-navy/35 scale-[1.02]"
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-navy/10 text-brand-navy">
                  <Bell className="h-5 w-5" aria-hidden />
                </span>
                <span className="text-2xl font-bold tabular-nums text-brand-navy">
                  {meta.unreadCount}
                </span>
              </div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-700">
                {t("alerts.unreadBadge")}
              </div>
              <div className="text-[11px] text-slate-500">{t("alerts.filterRead")}</div>
            </button>
          </div>
        </div>
      ) : null}

      <Card className="border-brand-navy/10 shadow-sm ring-1 ring-slate-100">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-brand-navy">
            {t("alerts.filters")}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-12 lg:items-end">
          <div className="space-y-2 lg:col-span-3">
            <Label className="text-slate-700">{t("alerts.filterLevel")}</Label>
            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger className="h-11 border-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("alerts.readAll")}</SelectItem>
                {LEVELS.map((l) => (
                  <SelectItem key={l} value={l}>
                    {alertLevelLabel(l, t)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 lg:col-span-3">
            <Label className="text-slate-700">{t("alerts.filterRead")}</Label>
            <Select value={readFilter} onValueChange={setReadFilter}>
              <SelectTrigger className="h-11 border-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("alerts.readAll")}</SelectItem>
                <SelectItem value="unread">{t("alerts.readUnread")}</SelectItem>
                <SelectItem value="read">{t("alerts.readRead")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 lg:col-span-2">
            <Label className="text-slate-700">{t("alerts.dateFrom")}</Label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-11 border-slate-200"
            />
          </div>
          <div className="space-y-2 lg:col-span-2">
            <Label className="text-slate-700">{t("alerts.dateTo")}</Label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-11 border-slate-200"
            />
          </div>
          <div className="flex flex-wrap gap-2 lg:col-span-2">
            <Button
              type="button"
              variant="outline"
              className="h-11 gap-2"
              onClick={() => void load()}
              disabled={loading}
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} aria-hidden />
              {t("alerts.refresh")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="h-11"
              onClick={() => {
                setDateFrom("");
                setDateTo("");
              }}
            >
              {t("alerts.clearDates")}
            </Button>
            {canSeedSample ? (
              <Button
                type="button"
                variant="secondary"
                className="h-11 gap-2 border-dashed border-brand-navy/25"
                disabled={seedLoading}
                onClick={() => void runSeedSample()}
              >
                <Zap className={cn("h-4 w-4", seedLoading && "animate-pulse")} aria-hidden />
                {t("alerts.seedDevButton")}
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-md ring-1 ring-slate-100">
        <Table>
          <TableHeader className="sticky top-0 z-[1] bg-slate-50/95 backdrop-blur">
            <TableRow className="border-slate-200 hover:bg-transparent">
              <TableHead className="w-[200px]">{t("alerts.colType")}</TableHead>
              <TableHead className="min-w-[200px]">{t("alerts.colWorker")}</TableHead>
              <TableHead className="w-[120px]">{t("alerts.colLevel")}</TableHead>
              <TableHead>{t("alerts.colMessage")}</TableHead>
              <TableHead className="w-[220px] text-right">{t("alerts.colActions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="py-14 text-center text-sm text-slate-500">
                  {t("common.loading")}
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="p-0">
                  <div className="flex flex-col items-center px-8 py-16 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-slate-100 to-slate-50 text-brand-navy shadow-inner">
                      <BellOff className="h-8 w-8 opacity-75" aria-hidden />
                    </div>
                    <p className="mt-5 text-base font-semibold text-brand-navy">
                      {t("alerts.emptyStateTitle")}
                    </p>
                    <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-600">
                      {t("alerts.emptyStateHint")}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => {
                const TypeIcon = alertTypeIcon(r.alertType);
                return (
                  <TableRow
                    key={r.id}
                    className={cn(
                      "border-slate-100 transition-colors hover:bg-slate-50/80",
                      !r.isRead && "bg-amber-50/30"
                    )}
                  >
                    <TableCell className="align-top">
                      <div className="flex items-start gap-2">
                        <span
                          className={cn(
                            "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border",
                            alertTypeIconTintClass(r.level)
                          )}
                        >
                          <TypeIcon className="h-4 w-4" aria-hidden />
                        </span>
                        <div className="min-w-0">
                          <Badge
                            variant="outline"
                            className="mb-1 border-slate-200 bg-white font-normal text-slate-800"
                          >
                            {alertTypeDisplay(r.alertType, t)}
                          </Badge>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      {r.worker ? (
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
                      ) : (
                        <span className="text-sm text-slate-500">{t("alerts.workerUnknown")}</span>
                      )}
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="flex flex-col gap-1">
                        <Badge
                          variant="outline"
                          className={cn(
                            "w-fit border-0 font-semibold shadow-sm",
                            alertLevelTableBadgeClass(r.level)
                          )}
                        >
                          {alertLevelLabel(r.level, t)}
                        </Badge>
                        {!r.isRead ? (
                          <span className="text-[11px] font-medium uppercase tracking-wide text-amber-800">
                            {t("alerts.badgeNew")}
                          </span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      <p className="line-clamp-2 text-sm leading-snug text-slate-900">{r.message}</p>
                      <p className="mt-1 text-xs tabular-nums text-slate-500">
                        {formatCreated(r.createdAt)}
                      </p>
                    </TableCell>
                    <TableCell className="align-top text-right">
                      <div className="flex flex-wrap justify-end gap-1.5">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1 border-slate-200 px-2"
                          onClick={() => setDetailRow(r)}
                        >
                          <Eye className="h-3.5 w-3.5" aria-hidden />
                          {t("alerts.actionDetail")}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1 border-slate-200 px-2"
                          disabled={r.isRead}
                          onClick={() => void markRead(r.id)}
                        >
                          <Check className="h-3.5 w-3.5" aria-hidden />
                          {t("alerts.actionMarkRead")}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1 border-red-200 px-2 text-red-700 hover:bg-red-50"
                          onClick={() => confirmDismiss(r.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden />
                          {t("alerts.actionDismiss")}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={detailRow !== null} onOpenChange={(o) => !o && setDetailRow(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("alerts.detailTitle")}</DialogTitle>
          </DialogHeader>
          {detailRow ? (
            <div className="grid gap-4 py-1 text-sm">
              <div className="grid gap-1">
                <span className="text-xs font-medium uppercase text-slate-500">
                  {t("alerts.fieldType")}
                </span>
                <span className="font-medium text-slate-900">
                  {alertTypeDisplay(detailRow.alertType, t)}
                </span>
              </div>
              <div className="grid gap-1">
                <span className="text-xs font-medium uppercase text-slate-500">
                  {t("alerts.fieldLevel")}
                </span>
                <Badge
                  variant="outline"
                  className={cn(
                    "w-fit border-0 font-semibold",
                    alertLevelTableBadgeClass(detailRow.level)
                  )}
                >
                  {alertLevelLabel(detailRow.level, t)}
                </Badge>
              </div>
              <div className="grid gap-1">
                <span className="text-xs font-medium uppercase text-slate-500">
                  {t("alerts.fieldWorker")}
                </span>
                {detailRow.worker ? (
                  <Link
                    href={`/workers/${detailRow.worker.id}`}
                    className="font-medium text-brand-navy hover:underline"
                  >
                    {detailRow.worker.firstName} {detailRow.worker.lastName}
                  </Link>
                ) : (
                  <span className="text-slate-600">{t("alerts.workerUnknown")}</span>
                )}
              </div>
              <div className="grid gap-1">
                <span className="text-xs font-medium uppercase text-slate-500">
                  {t("alerts.fieldRead")}
                </span>
                <span>{detailRow.isRead ? t("alerts.readYes") : t("alerts.readNo")}</span>
              </div>
              <div className="grid gap-1">
                <span className="text-xs font-medium uppercase text-slate-500">
                  {t("alerts.fieldCreated")}
                </span>
                <span className="tabular-nums text-slate-700">
                  {formatCreated(detailRow.createdAt)}
                </span>
              </div>
              <div className="grid gap-1">
                <span className="text-xs font-medium uppercase text-slate-500">
                  {t("alerts.colMessage")}
                </span>
                <p className="whitespace-pre-wrap rounded-md border border-slate-100 bg-slate-50/80 p-3 text-slate-800">
                  {detailRow.message}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setDetailRow(null)}>
                  {t("common.close")}
                </Button>
                {!detailRow.isRead ? (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() =>
                      void (async () => {
                        const ok = await markRead(detailRow.id);
                        if (ok) setDetailRow(null);
                      })()
                    }
                  >
                    {t("alerts.actionMarkRead")}
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
