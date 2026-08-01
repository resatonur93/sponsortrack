"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { ComplianceTrafficLight } from "@/components/dashboard/ComplianceTrafficLight";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { RiskBadge } from "@/components/dashboard/RiskBadge";
import { RecentEvents } from "@/components/dashboard/RecentEvents";
import { UrgentAlertsPanel } from "@/components/dashboard/UrgentAlertsPanel";
import { ComplianceCategoryCards } from "@/components/dashboard/ComplianceCategoryCards";
import { UpcomingDeadlines } from "@/components/dashboard/UpcomingDeadlines";
import { RecordKeepingCards } from "@/components/dashboard/RecordKeepingCards";
import { PercentRing } from "@/components/ui/PercentRing";
import { getGreetingKey } from "@/lib/greeting";
import { computeCompliancePercent } from "@/lib/compliance/compliance-percent";
import type { FullDashboardData } from "@/lib/dashboard-response";
import type {
  AlertLevel,
  AlertType,
  NotificationType,
  RiskLevel,
} from "@prisma/client";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTranslation } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Users,
  BriefcaseBusiness,
  BellRing,
  AlertCircle,
  FileX,
  Plus,
} from "lucide-react";

const URGENT_POPUP_SESSION_KEY = "st-dashboard-urgent-v1";

function dashboardHasUrgentSignals(d: FullDashboardData): boolean {
  if (d.stats.overdueNotifications > 0) return true;
  if (d.highPriorityMissing?.length) return true;
  return d.recentAlerts.some(
    (a) => !a.isRead && (a.level === "CRITICAL" || a.level === "HIGH")
  );
}

export default function DashboardPage(): JSX.Element {
  const { t, locale } = useTranslation();
  const { data: session } = useSession();
  const [data, setData] = useState<FullDashboardData | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [retryTick, setRetryTick] = useState(0);
  const [urgentPopupOpen, setUrgentPopupOpen] = useState(false);
  const localeTag = locale === "tr" ? "tr-TR" : "en-GB";

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoadFailed(false);
      const res = await fetch("/api/compliance/dashboard", {
        credentials: "include",
        cache: "no-store",
      });
      if (cancelled) return;
      if (!res.ok) {
        setLoadFailed(true);
        setData(null);
        return;
      }
      const json = (await res.json()) as { data: FullDashboardData };
      setData(json.data);
    })();
    return () => {
      cancelled = true;
    };
  }, [retryTick]);

  useEffect(() => {
    if (!data) return;
    if (!dashboardHasUrgentSignals(data)) return;
    let dismissed = false;
    try {
      dismissed = sessionStorage.getItem(URGENT_POPUP_SESSION_KEY) === "1";
    } catch {
      dismissed = false;
    }
    if (dismissed) return;
    const id = window.setTimeout(() => setUrgentPopupOpen(true), 500);
    return () => window.clearTimeout(id);
  }, [data]);

  const dismissUrgentPopup = (): void => {
    try {
      sessionStorage.setItem(URGENT_POPUP_SESSION_KEY, "1");
    } catch {
      /* ignore private mode etc. */
    }
    setUrgentPopupOpen(false);
  };

  if (loadFailed) {
    return (
      <div
        role="alert"
        className="mx-auto max-w-lg rounded-xl border border-danger-border bg-danger-muted p-6 shadow-sm"
      >
        <h1 className="text-lg font-semibold text-danger">{t("common.errorLoad")}</h1>
        <p className="mt-2 text-sm text-slate-800">{t("dashboard.retryHint")}</p>
        <Button
          type="button"
          variant="outline"
          className="mt-4 border-danger-border bg-white text-slate-900 hover:bg-danger-muted"
          onClick={() => setRetryTick((n) => n + 1)}
        >
          {t("common.retry")}
        </Button>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="space-y-6" aria-busy="true" aria-live="polite">
        <div className="space-y-2">
          <div className="h-9 w-48 animate-pulse rounded-md bg-brand-navy/15" />
          <div className="h-5 w-full max-w-xl animate-pulse rounded-md bg-brand-navy/10" />
        </div>
        <p className="text-sm text-slate-600">{t("dashboard.loadingHint")}</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-lg border border-brand-navy/10 bg-white shadow-card"
            />
          ))}
        </div>
        <ComplianceTrafficLight traffic={null} />
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="h-48 animate-pulse rounded-lg border border-brand-navy/10 bg-white shadow-card" />
          <div className="h-48 animate-pulse rounded-lg border border-brand-navy/10 bg-white shadow-card" />
        </div>
      </div>
    );
  }

  const unreadCriticalAlerts = data.recentAlerts.filter(
    (a) => !a.isRead && (a.level === "CRITICAL" || a.level === "HIGH")
  ).length;

  const greetingKey = getGreetingKey(new Date().getHours());
  const firstName = session?.user?.firstName;
  const todayLabel = new Date().toLocaleDateString(localeTag, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const workersWithIssues = new Set(
    data.complianceTraffic.aggregateItems.map((row) => row.workerId)
  ).size;
  const compliancePercent = computeCompliancePercent(
    data.stats.totalWorkers,
    workersWithIssues
  );
  const complianceStanding: { key: string; className: string; ringColor: string } =
    compliancePercent === null
      ? { key: "goodStanding", className: "bg-emerald-100 text-emerald-700", ringColor: "#059669" }
      : compliancePercent >= 80
        ? { key: "goodStanding", className: "bg-emerald-100 text-emerald-700", ringColor: "#059669" }
        : compliancePercent >= 50
          ? { key: "needsAttention", className: "bg-amber-100 text-amber-700", ringColor: "#D97706" }
          : { key: "atRisk", className: "bg-red-100 text-red-700", ringColor: "#DC2626" };

  return (
    <div className="space-y-8">
      <Dialog open={urgentPopupOpen} onOpenChange={(o) => !o && dismissUrgentPopup()}>
        <DialogContent className="max-w-md border-amber-200 bg-amber-50/95 sm:rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-amber-950">
              {t("dashboard.urgentPopup.title")}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-amber-900/90">{t("dashboard.urgentPopup.intro")}</p>
          <ul className="list-inside list-disc space-y-1.5 text-sm text-amber-950">
            {data.stats.overdueNotifications > 0 ? (
              <li>
                <span className="font-medium">
                  {t("dashboard.urgentPopup.overdueLabel")}:{" "}
                </span>
                {data.stats.overdueNotifications}
              </li>
            ) : null}
            {data.highPriorityMissing?.length ? (
              <li>
                <span className="font-medium">
                  {t("dashboard.urgentPopup.missingDocsLabel")}:{" "}
                </span>
                {data.highPriorityMissing.length}
              </li>
            ) : null}
            {unreadCriticalAlerts > 0 ? (
              <li>
                <span className="font-medium">
                  {t("dashboard.urgentPopup.alertLabel")}:{" "}
                </span>
                {unreadCriticalAlerts}
              </li>
            ) : null}
          </ul>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
            <Link
              href="/notifications"
              className="inline-flex h-10 items-center justify-center rounded-lg bg-brand-navy px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-gold hover:text-brand-navy"
              onClick={() => dismissUrgentPopup()}
            >
              {t("dashboard.urgentPopup.gotoNotifications")}
            </Link>
            <Link
              href="/alerts"
              className="inline-flex h-10 items-center justify-center rounded-lg border border-brand-navy/25 bg-white px-4 text-sm font-medium text-brand-navy transition-colors hover:border-brand-gold hover:bg-brand-gold/15"
              onClick={() => dismissUrgentPopup()}
            >
              {t("dashboard.urgentPopup.gotoAlerts")}
            </Link>
            <Button type="button" variant="outline" onClick={() => dismissUrgentPopup()}>
              {t("dashboard.urgentPopup.dismiss")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Page header ── */}
      <div className="page-hero">
        <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-white/50">
              {todayLabel}
            </p>
            <h1 className="mt-1 font-serif text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              {t(`dashboard.greeting.${greetingKey}`)}
              {firstName ? `, ${firstName}` : ""}
            </h1>
            <p className="mt-1 text-sm text-white/65 sm:text-base">
              {t("dashboard.subtitle")}
            </p>
          </div>
          <Link
            href="/organisation-changes"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-white/25 bg-white/95 px-4 py-2 text-sm font-semibold text-brand-navy shadow-sm transition-colors hover:bg-brand-gold hover:text-brand-navy"
          >
            <Plus className="h-4 w-4" aria-hidden />
            {t("dashboard.reportChange")}
          </Link>
        </div>
        {/* Decorative circle */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full opacity-10"
          style={{
            background: "radial-gradient(circle, #d4af87 0%, transparent 70%)",
          }}
        />
      </div>

      {/* ── Portfolio compliance + Urgent alerts (top row, mirrors reference layout) ── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-5 rounded-xl border border-slate-100 bg-white p-5 shadow-card">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">
              {t("dashboard.complianceRing.title")}
            </h2>
            {compliancePercent !== null ? (
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                  complianceStanding.className
                )}
              >
                {t(`dashboard.complianceRing.${complianceStanding.key}`)}
              </span>
            ) : null}
          </div>
          {compliancePercent !== null ? (
            <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
              <PercentRing
                percent={compliancePercent}
                size={116}
                stroke={complianceStanding.ringColor}
              />
              <div className="grid flex-1 grid-cols-3 gap-3 text-center sm:text-left">
                <div>
                  <p className="text-2xl font-bold tabular-nums text-brand-navy">
                    {data.stats.totalWorkers}
                  </p>
                  <p className="text-xs text-slate-500">{t("dashboard.totalWorkers")}</p>
                </div>
                <div>
                  <p className="text-2xl font-bold tabular-nums text-brand-navy">
                    {data.stats.activeSponsorships}
                  </p>
                  <p className="text-xs text-slate-500">{t("dashboard.activeSponsorships")}</p>
                </div>
                <div>
                  <p className="text-2xl font-bold tabular-nums text-brand-navy">
                    {data.stats.overdueNotifications + (data.stats.missingDocumentIssues ?? 0)}
                  </p>
                  <p className="text-xs text-slate-500">
                    {t("dashboard.complianceRing.actionsRequired")}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">{t("dashboard.noMissingDocs")}</p>
          )}
          <Link
            href="/audit"
            className="text-xs font-semibold text-brand-navy transition-colors hover:text-brand-gold"
          >
            {t("dashboard.complianceRing.viewOverview")} →
          </Link>
        </div>

        <UrgentAlertsPanel alerts={data.recentAlerts} />
      </div>

      {/* ── Compliance categories + Upcoming deadlines (second row, mirrors reference layout) ── */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ComplianceCategoryCards categories={data.complianceTraffic.categories} />
        </div>
        <UpcomingDeadlines events={data.recentEvents} />
      </div>

      {/* ── Stats grid ── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatsCard
          title={t("dashboard.totalWorkers")}
          value={data.stats.totalWorkers}
          icon={Users}
          accent="default"
          className="animate-fade-up animate-stagger-1"
        />
        <StatsCard
          title={t("dashboard.activeSponsorships")}
          value={data.stats.activeSponsorships}
          icon={BriefcaseBusiness}
          accent="default"
          className="animate-fade-up animate-stagger-2"
        />
        <StatsCard
          title={t("dashboard.pendingNotifications")}
          value={data.stats.pendingNotifications}
          icon={BellRing}
          accent={data.stats.pendingNotifications > 0 ? "warning" : "default"}
          className="animate-fade-up animate-stagger-3"
        />
        <StatsCard
          title={t("dashboard.overdueNotifications")}
          value={data.stats.overdueNotifications}
          icon={AlertCircle}
          accent={data.stats.overdueNotifications > 0 ? "danger" : "default"}
          className="animate-fade-up animate-stagger-4"
        />
        <StatsCard
          title={t("dashboard.missingDocs")}
          value={data.stats.missingDocumentIssues ?? 0}
          icon={FileX}
          accent={(data.stats.missingDocumentIssues ?? 0) > 0 ? "warning" : "default"}
          className="animate-fade-up animate-stagger-5"
        />
      </div>

      <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-card">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">
            {t("dashboard.riskEngine")}
          </h2>
          <Link
            href="/risk-report"
            className="text-xs font-semibold text-brand-navy transition-colors hover:text-brand-gold"
          >
            {t("dashboard.riskEngineFullRanking")} →
          </Link>
        </div>
        {data.riskEngine.workerScores === 0 ? (
          <p className="text-sm text-slate-600">
            {t("dashboard.riskEngineEmptyBefore")}
            <code className="text-xs">/api/cron/risk-scores</code>
            {t("dashboard.riskEngineEmptyAfter")}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(["LOW", "MEDIUM", "HIGH", "CRITICAL"] as RiskLevel[]).map((lvl) => (
              <div
                key={lvl}
                className={cn(
                  "rounded-xl border px-4 py-3 transition-colors",
                  lvl === "CRITICAL"
                    ? "border-danger/20 bg-danger/5"
                    : lvl === "HIGH"
                    ? "border-warning/20 bg-warning/5"
                    : lvl === "MEDIUM"
                    ? "border-brand-amber/20 bg-amber-50"
                    : "border-success/20 bg-success/5"
                )}
              >
                <p
                  className={cn(
                    "text-[10px] font-bold uppercase tracking-widest",
                    lvl === "CRITICAL"
                      ? "text-danger"
                      : lvl === "HIGH"
                      ? "text-warning"
                      : lvl === "MEDIUM"
                      ? "text-amber-700"
                      : "text-success"
                  )}
                >
                  {t(`risk.${lvl}`)}
                </p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-brand-navy">
                  {data.riskEngine.byLevel[lvl]}
                </p>
              </div>
            ))}
          </div>
        )}
        {data.riskEngine.lastCalculatedAt ? (
          <p className="mt-2 text-xs text-slate-500">
            {t("dashboard.lastCalculated")}{" "}
            {new Date(data.riskEngine.lastCalculatedAt).toLocaleString(localeTag)}
          </p>
        ) : null}
      </div>

      {data.highPriorityMissing && data.highPriorityMissing.length > 0 ? (
        <div className="rounded-xl border border-danger/20 bg-danger/5 p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-danger">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-danger/15 text-[10px] font-bold">
              {data.highPriorityMissing.length}
            </span>
            {t("dashboard.highPriorityMissing")}
          </h2>
          <ul className="mt-2 space-y-2 text-sm">
            {data.highPriorityMissing.map((h) => (
              <li key={h.workerId} className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-1">
                <Link
                  href={`/workers/${h.workerId}`}
                  className="font-semibold text-brand-navy underline-offset-2 hover:underline"
                >
                  {h.name}
                </Link>
                <span className="text-xs text-red-700 sm:text-sm">{h.labels.join(", ")}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-sm font-medium text-slate-600">
            {t("dashboard.riskScore")}
          </h2>
          <RiskBadge level={data.risk.level} score={data.risk.score} />
        </div>
      </div>

      <RecordKeepingCards
        licence={data.licence}
        keyPersonnel={data.keyPersonnel}
        recruitment={data.recruitment}
        rtwSummary={data.rtwSummary}
        payrollAttendance={data.payrollAttendance}
        smsReporting={data.smsReporting}
        auditHistory={data.auditHistory}
      />
      <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">
            {t("dashboard.missingDocTracking")}
          </h2>
          <span className="rounded-full bg-brand-navy/8 px-2.5 py-0.5 text-xs font-semibold text-brand-navy">
            {data.missingDocumentsTable?.length ?? 0}{" "}
            {t("dashboard.missingDocListed")}
          </span>
        </div>
        {!data.missingDocumentsTable || data.missingDocumentsTable.length === 0 ? (
          <p className="text-sm text-slate-500">{t("dashboard.noMissingDocs")}</p>
        ) : (
          <>
            {/* Mobile card list */}
            <div className="space-y-2 md:hidden">
              {data.missingDocumentsTable.map((row, idx) => (
                <div
                  key={row.workerId}
                  className="rounded-xl border border-brand-navy/12 bg-brand-surface/50 p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <span className="mr-2 text-xs font-medium text-slate-400">
                        #{idx + 1}
                      </span>
                      <Link
                        href={`/workers/${row.workerId}`}
                        className="font-semibold text-brand-navy underline-offset-2 hover:underline"
                      >
                        {row.name}
                      </Link>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {row.highCount > 0 && (
                        <Badge variant="danger" className="px-2 py-0 text-[11px]">
                          H:{row.highCount}
                        </Badge>
                      )}
                      {row.mediumCount > 0 && (
                        <Badge variant="warning" className="px-2 py-0 text-[11px]">
                          M:{row.mediumCount}
                        </Badge>
                      )}
                      {row.lowCount > 0 && (
                        <Badge variant="success" className="px-2 py-0 text-[11px]">
                          L:{row.lowCount}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {row.labels.slice(0, 3).map((label) => (
                      <Badge
                        key={`${row.workerId}-${label}`}
                        variant="outline"
                        className="text-[11px]"
                      >
                        {label}
                      </Badge>
                    ))}
                    {row.labels.length > 3 ? (
                      <Badge variant="outline" className="text-[11px]">
                        +{row.labels.length - 3}
                      </Badge>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">{t("dashboard.tableSn")}</TableHead>
                    <TableHead>{t("dashboard.tableWorker")}</TableHead>
                    <TableHead>{t("dashboard.tableMissingTitles")}</TableHead>
                    <TableHead className="w-24">{t("dashboard.tableHigh")}</TableHead>
                    <TableHead className="w-24">{t("dashboard.tableMedium")}</TableHead>
                    <TableHead className="w-24">{t("dashboard.tableLow")}</TableHead>
                    <TableHead className="w-24 text-right">
                      {t("dashboard.tableDetail")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.missingDocumentsTable.map((row, idx) => (
                    <TableRow key={row.workerId}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell>
                        <Link
                          href={`/workers/${row.workerId}`}
                          className="font-medium text-brand-navy underline"
                        >
                          {row.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {row.labels.slice(0, 3).map((label) => (
                            <Badge key={`${row.workerId}-${label}`} variant="outline">
                              {label}
                            </Badge>
                          ))}
                          {row.labels.length > 3 ? (
                            <Badge variant="outline">+{row.labels.length - 3}</Badge>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={row.highCount > 0 ? "danger" : "outline"}>
                          {row.highCount}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={row.mediumCount > 0 ? "warning" : "outline"}>
                          {row.mediumCount}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={row.lowCount > 0 ? "success" : "outline"}>
                          {row.lowCount}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          href={`/workers/${row.workerId}`}
                          className="text-sm text-brand-navy underline"
                        >
                          {t("common.open")}
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </div>
      <RecentEvents events={data.recentEvents} />
    </div>
  );
}
