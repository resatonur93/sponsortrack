"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ComplianceRiskLevel } from "@prisma/client";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  CalendarClock,
  CalendarRange,
  ClipboardList,
  FileDown,
  FileText,
  FolderOpen,
  Layers,
  Receipt,
  RefreshCw,
  Search,
  UserCheck,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import type { AuditDashboardPayload } from "@/lib/audit-dashboard-data";
import {
  AUDIT_RISK_LEVEL_ORDER,
  AUDIT_RISK_CHART_COLORS,
  auditRiskBarData,
  auditRiskPieData,
  auditRiskTotals,
} from "@/lib/audit/dashboard";
import { useTranslation } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

type WorkerRow = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  cosReference: string;
  employmentStatus: string;
  complianceRiskLevel: ComplianceRiskLevel;
  visaExpiryDate: string | null;
  missingDocumentCount: number;
  missingHigh: number;
};

type FilterState = {
  search: string;
  workerId: string;
  riskLevel: string;
  notificationEventType: string;
  complianceEventType: string;
  dateFrom: string;
  dateTo: string;
};

const emptyFilters: FilterState = {
  search: "",
  workerId: "",
  riskLevel: "all",
  notificationEventType: "all",
  complianceEventType: "all",
  dateFrom: "",
  dateTo: "",
};

function filtersFromSearchParams(sp: URLSearchParams): FilterState {
  return {
    search: sp.get("search") ?? "",
    workerId: sp.get("workerId") ?? "",
    riskLevel: sp.get("riskLevel") ?? "all",
    notificationEventType: sp.get("notificationEventType") ?? "all",
    complianceEventType: sp.get("complianceEventType") ?? "all",
    dateFrom: sp.get("dateFrom") ?? "",
    dateTo: sp.get("dateTo") ?? "",
  };
}

function buildQueryParams(f: FilterState, extra: Record<string, string>): string {
  const p = new URLSearchParams();
  Object.entries(extra).forEach(([k, v]) => p.set(k, v));
  if (f.search.trim()) p.set("search", f.search.trim());
  if (f.workerId.trim()) p.set("workerId", f.workerId.trim());
  if (f.riskLevel !== "all") p.set("riskLevel", f.riskLevel);
  if (f.notificationEventType !== "all") {
    p.set("notificationEventType", f.notificationEventType);
  }
  if (f.complianceEventType !== "all") {
    p.set("complianceEventType", f.complianceEventType);
  }
  if (f.dateFrom) p.set("dateFrom", f.dateFrom);
  if (f.dateTo) p.set("dateTo", f.dateTo);
  return p.toString();
}

function workerInitials(first: string, last: string): string {
  const a = first.trim().charAt(0);
  const b = last.trim().charAt(0);
  return `${a}${b}`.toUpperCase() || "?";
}

function AuditDashboardContent(): JSX.Element | null {
  const { t, locale } = useTranslation();
  const localeTag = locale === "tr" ? "tr-TR" : "en-GB";
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [dash, setDash] = useState<AuditDashboardPayload | null>(null);
  const [workers, setWorkers] = useState<WorkerRow[]>([]);
  const [draftFilters, setDraftFilters] = useState<FilterState>(emptyFilters);
  const [loadingDash, setLoadingDash] = useState(true);
  const [loadingWorkers, setLoadingWorkers] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const urlKey = searchParams.toString();
  const appliedFromUrl = useMemo(
    () => filtersFromSearchParams(searchParams),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync when URL query string changes
    [urlKey]
  );

  useEffect(() => {
    setDraftFilters(appliedFromUrl);
  }, [appliedFromUrl]);

  const loadDash = useCallback(async (): Promise<void> => {
    setLoadingDash(true);
    setError(null);
    try {
      const res = await fetch("/api/audit/dashboard", {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) {
        setError(t("audit.dashboard.errorDash"));
        return;
      }
      const json = (await res.json()) as { data: AuditDashboardPayload };
      setDash(json.data);
    } finally {
      setLoadingDash(false);
    }
  }, [t]);

  const loadWorkers = useCallback(
    async (f: FilterState): Promise<void> => {
      setLoadingWorkers(true);
      setError(null);
      try {
        const q = buildQueryParams(f, { limit: "200" });
        const res = await fetch(`/api/audit/workers?${q}`, {
          credentials: "include",
          cache: "no-store",
        });
        if (!res.ok) {
          setError(t("audit.dashboard.errorWorkers"));
          return;
        }
        const json = (await res.json()) as { data: WorkerRow[] };
        setWorkers(json.data);
      } finally {
        setLoadingWorkers(false);
      }
    },
    [t]
  );

  useEffect(() => {
    void loadDash();
  }, [loadDash]);

  useEffect(() => {
    void loadWorkers(appliedFromUrl);
  }, [appliedFromUrl, loadWorkers]);

  const pieData = useMemo(
    () => (dash ? auditRiskPieData(dash.riskSummary) : []),
    [dash]
  );
  const barData = useMemo(
    () => (dash ? auditRiskBarData(dash.riskSummary) : []),
    [dash]
  );
  const riskWorkerTotal = useMemo(
    () => (dash ? auditRiskTotals(dash.riskSummary) : 0),
    [dash]
  );

  const csvHref = `/api/audit/export?${buildQueryParams(appliedFromUrl, { format: "csv" })}`;
  const pdfHref = `/api/audit/export?${buildQueryParams(appliedFromUrl, { format: "pdf" })}`;

  function applyFilters(): void {
    const q = buildQueryParams(draftFilters, {});
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
  }

  function resetFilters(): void {
    router.replace(pathname, { scroll: false });
  }

  if (loadingDash && !dash) {
    return (
      <div className="flex min-h-[38vh] items-center justify-center text-slate-600">
        {t("common.loading")}
      </div>
    );
  }
  if (error && !dash) {
    return (
      <div className="space-y-3">
        <p className="text-red-700">{error}</p>
        <Button type="button" variant="outline" onClick={() => void loadDash()}>
          {t("common.retry")}
        </Button>
      </div>
    );
  }
  if (!dash) {
    return <p className="text-slate-600">{t("audit.dashboard.noData")}</p>;
  }

  return (
    <div className="space-y-10 pb-10">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-brand-navy md:text-3xl">
            {t("audit.dashboard.title")}
          </h1>
          <p className="max-w-3xl text-sm leading-relaxed text-slate-600">
            {t("audit.dashboard.subtitle")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="default"
            className="h-10 gap-2 bg-brand-navy shadow-sm hover:bg-brand-navy/90"
            asChild
          >
            <a href={csvHref} download>
              <FileDown className="h-4 w-4" aria-hidden />
              {t("audit.dashboard.exportCsv")}
            </a>
          </Button>
          <Button type="button" variant="outline" className="h-10 gap-2 border-brand-navy/25 font-semibold" asChild>
            <a href={pdfHref}>
              <FileText className="h-4 w-4" aria-hidden />
              {t("audit.dashboard.exportPdf")}
            </a>
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="h-10 gap-2"
            onClick={() => void loadDash()}
            disabled={loadingDash}
          >
            <RefreshCw className={cn("h-4 w-4", loadingDash && "animate-spin")} aria-hidden />
            {t("audit.dashboard.refresh")}
          </Button>
        </div>
      </div>

      {error ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          {error}
        </p>
      ) : null}

      <section className="space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
          {t("audit.dashboard.section.glance")}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <GlanceStat
            icon={Users}
            label={t("audit.dashboard.stats.totalWorkers")}
            hint={t("audit.dashboard.stats.totalWorkersHint")}
            value={dash.stats.totalSponsoredWorkers}
            sentiment="neutral"
          />
          <GlanceStat
            icon={UserCheck}
            label={t("audit.dashboard.stats.activeSponsorships")}
            hint={t("audit.dashboard.stats.activeSponsorshipsHint")}
            value={dash.stats.activeSponsorships}
            sentiment="positive"
          />
          <GlanceStat
            icon={CalendarClock}
            label={t("audit.dashboard.stats.visas30d")}
            hint={t("audit.dashboard.stats.visas30dHint")}
            value={dash.stats.visasExpiring30d}
            sentiment={dash.stats.visasExpiring30d > 0 ? "caution" : "positive"}
          />
          <GlanceStat
            icon={CalendarRange}
            label={t("audit.dashboard.stats.visas90d")}
            hint={t("audit.dashboard.stats.visas90dHint")}
            value={dash.stats.visasExpiring90dWindow}
            sentiment={dash.stats.visasExpiring90dWindow > 0 ? "caution" : "neutral"}
          />
          <GlanceStat
            icon={ClipboardList}
            label={t("audit.dashboard.stats.overdueReports")}
            hint={t("audit.dashboard.stats.overdueReportsHint")}
            value={dash.stats.overdueReports}
            sentiment={dash.stats.overdueReports > 0 ? "critical" : "positive"}
          />
          <GlanceStat
            icon={FolderOpen}
            label={t("audit.dashboard.stats.missingDocsWorkers")}
            hint={t("audit.dashboard.stats.missingDocsWorkersHint")}
            value={dash.stats.missingDocumentsWorkers}
            sentiment={dash.stats.missingDocumentsWorkers > 0 ? "critical" : "positive"}
          />
          <GlanceStat
            icon={Receipt}
            label={t("audit.dashboard.stats.salaryAnomalyRecords")}
            hint={t("audit.dashboard.stats.salaryAnomalyRecordsHint")}
            value={dash.stats.salaryAnomalyRecords}
            sentiment={dash.stats.salaryAnomalyRecords > 0 ? "critical" : "neutral"}
          />
          <GlanceStat
            icon={Layers}
            label={t("audit.dashboard.stats.salaryAnomalyWorkers")}
            hint={t("audit.dashboard.stats.salaryAnomalyWorkersHint")}
            value={dash.stats.salaryAnomalyWorkers}
            sentiment={dash.stats.salaryAnomalyWorkers > 0 ? "critical" : "neutral"}
          />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2 lg:items-stretch">
        <Card className="overflow-hidden border-brand-navy/10 shadow-lg ring-1 ring-slate-100">
          <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-brand-navy/[0.05] via-white to-slate-50/90">
            <CardTitle className="text-lg text-brand-navy">{t("audit.dashboard.section.riskSummary")}</CardTitle>
            <CardDescription className="text-sm text-slate-600">
              {t("audit.dashboard.stats.totalWorkersHint")}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="relative mx-auto max-w-md">
              <div className="h-[300px] w-full">
                {pieData.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-slate-500">
                    {t("audit.dashboard.riskDonutEmpty")}
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={72}
                        outerRadius={108}
                        paddingAngle={1}
                        stroke="#fff"
                        strokeWidth={2}
                      >
                        {pieData.map((entry) => (
                          <Cell key={entry.name} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const row = payload[0].payload as {
                            name: ComplianceRiskLevel;
                            value: number;
                          };
                          return (
                            <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-md">
                              <p className="font-semibold text-brand-navy">
                                {t(`audit.dashboard.risk.${row.name}`)}
                              </p>
                              <p className="tabular-nums text-slate-600">
                                {row.value} {t("audit.dashboard.tooltipWorkers")}
                              </p>
                            </div>
                          );
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
              {pieData.length > 0 ? (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="text-center pt-2">
                    <p className="text-3xl font-bold tabular-nums text-brand-navy">{riskWorkerTotal}</p>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      {t("audit.dashboard.riskDonutCenter")}
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
            <ul className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-3 border-t border-slate-100 pt-6">
              {AUDIT_RISK_LEVEL_ORDER.map((lvl) => {
                const n = dash.riskSummary[lvl] ?? 0;
                return (
                  <li key={lvl} className="flex items-center gap-2 text-xs">
                    <span
                      className="h-3 w-3 shrink-0 rounded-sm shadow-sm ring-1 ring-black/10"
                      style={{ backgroundColor: AUDIT_RISK_CHART_COLORS[lvl] }}
                      aria-hidden
                    />
                    <span className={cn("font-semibold uppercase tracking-wide", n === 0 && "text-slate-400")}>
                      {t(`audit.dashboard.risk.${lvl}`)}
                    </span>
                    <span className={cn("tabular-nums text-slate-600", n === 0 && "text-slate-400")}>{n}</span>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-brand-navy/10 shadow-lg ring-1 ring-slate-100">
          <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-brand-navy/[0.05] via-white to-slate-50/90">
            <CardTitle className="text-lg text-brand-navy">{t("audit.dashboard.section.riskByLevel")}</CardTitle>
            <CardDescription className="text-sm text-slate-600">{t("audit.dashboard.riskBarHint")}</CardDescription>
          </CardHeader>
          <CardContent className="h-[380px] pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ left: 4, right: 8, top: 16, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-slate-200" />
                <XAxis
                  dataKey="level"
                  tick={{ fontSize: 11, fill: "#475569" }}
                  tickFormatter={(v) => t(`audit.dashboard.risk.${v as ComplianceRiskLevel}`)}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  width={36}
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: "rgba(15, 23, 42, 0.055)" }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const row = payload[0].payload as {
                      level: ComplianceRiskLevel;
                      count: number;
                    };
                    return (
                      <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-md">
                        <p className="font-semibold text-brand-navy">{t(`audit.dashboard.risk.${row.level}`)}</p>
                        <p className="tabular-nums text-slate-600">
                          {row.count} {t("audit.dashboard.tooltipWorkers")}
                        </p>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={56}>
                  {barData.map((entry) => (
                    <Cell key={entry.level} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
          {t("audit.dashboard.section.actionRequired")}
        </h2>
        <div className="grid gap-5 lg:grid-cols-3">
          <ActionQueueCard
            title={t("audit.dashboard.action.overdue")}
            empty={t("audit.dashboard.action.overdueEmpty")}
            columns={[
              t("audit.dashboard.action.colKind"),
              t("audit.dashboard.action.colEvent"),
              t("audit.dashboard.action.colWorker"),
              t("audit.dashboard.action.colDue"),
              t("audit.dashboard.action.colStatus"),
            ]}
            rows={dash.actionRequired.overdueItems.map((r) => ({
              key: `${r.kind}-${r.id}`,
              cells: [
                r.kind,
                r.type,
                <Link
                  key="w"
                  href={`/workers/${r.workerId}`}
                  className="font-medium text-brand-navy underline decoration-brand-navy/30 underline-offset-2 hover:decoration-brand-navy"
                >
                  {r.workerName}
                </Link>,
                fmtShort(r.deadline, localeTag),
                r.status,
              ],
            }))}
          />
          <ActionQueueCard
            title={t("audit.dashboard.action.upcoming")}
            empty={t("audit.dashboard.action.upcomingEmpty")}
            columns={[
              t("audit.dashboard.action.colKind"),
              t("audit.dashboard.action.colEvent"),
              t("audit.dashboard.action.colWorker"),
              t("audit.dashboard.action.colDue"),
              t("audit.dashboard.action.colStatus"),
            ]}
            rows={dash.actionRequired.upcomingDeadlines7d.map((r) => ({
              key: `${r.kind}-${r.id}`,
              cells: [
                r.kind,
                r.type,
                <Link
                  key="w"
                  href={`/workers/${r.workerId}`}
                  className="font-medium text-brand-navy underline decoration-brand-navy/30 underline-offset-2 hover:decoration-brand-navy"
                >
                  {r.workerName}
                </Link>,
                fmtShort(r.deadline, localeTag),
                r.status,
              ],
            }))}
          />
          <MissingDocumentsCard
            title={t("audit.dashboard.action.missingDocs")}
            empty={t("audit.dashboard.action.missingDocsEmpty")}
            items={dash.actionRequired.missingDocuments}
            totalLabel={t("audit.dashboard.action.missingTotal")}
            priorityHint={t("audit.dashboard.action.missingHighMedLow")}
            documentsLabel={t("audit.dashboard.action.openDocuments")}
          />
        </div>
      </section>

      <Card className="overflow-hidden border-brand-navy/10 shadow-lg ring-1 ring-slate-100">
        <CardHeader className="flex flex-col gap-4 border-b border-slate-100 bg-slate-50/50 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-lg text-brand-navy">{t("audit.dashboard.section.workers")}</CardTitle>
            <CardDescription className="text-sm text-slate-600">{t("audit.dashboard.filters.urlSynced")}</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="default" className="h-9 gap-2 bg-brand-navy shadow-sm" asChild>
              <a href={csvHref} download>
                <FileDown className="h-3.5 w-3.5" aria-hidden />
                {t("audit.dashboard.exportCsvFiltered")}
              </a>
            </Button>
            <Button type="button" variant="outline" className="h-9 gap-2 border-brand-navy/25 font-semibold" asChild>
              <a href={pdfHref}>
                <FileText className="h-3.5 w-3.5" aria-hidden />
                {t("audit.dashboard.exportPdfFiltered")}
              </a>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="rounded-xl border border-slate-200/90 bg-slate-50/60 p-5 ring-1 ring-slate-100">
            <p className="text-xs font-bold uppercase tracking-wider text-brand-navy/80">{t("audit.dashboard.filters.title")}</p>
            <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              <div className="space-y-1.5">
                <Label className="text-slate-700">{t("audit.dashboard.filters.search")}</Label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    className="border-slate-200 bg-white pl-9"
                    value={draftFilters.search}
                    onChange={(e) => setDraftFilters((s) => ({ ...s, search: e.target.value }))}
                    placeholder={t("audit.dashboard.filters.searchPh")}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-700">{t("audit.dashboard.filters.workerId")}</Label>
                <Input
                  className="border-slate-200 bg-white"
                  value={draftFilters.workerId}
                  onChange={(e) => setDraftFilters((s) => ({ ...s, workerId: e.target.value }))}
                  placeholder={t("audit.dashboard.filters.workerIdPh")}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-700">{t("audit.dashboard.filters.riskLevel")}</Label>
                <Select
                  value={draftFilters.riskLevel}
                  onValueChange={(v) => setDraftFilters((s) => ({ ...s, riskLevel: v }))}
                >
                  <SelectTrigger className="border-slate-200 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("common.all")}</SelectItem>
                    {AUDIT_RISK_LEVEL_ORDER.map((r) => (
                      <SelectItem key={r} value={r}>
                        {t(`audit.dashboard.risk.${r}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-700">{t("audit.dashboard.filters.notifType")}</Label>
                <Select
                  value={draftFilters.notificationEventType}
                  onValueChange={(v) => setDraftFilters((s) => ({ ...s, notificationEventType: v }))}
                >
                  <SelectTrigger className="border-slate-200 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectItem value="all">{t("common.all")}</SelectItem>
                    {dash.filterOptions.notificationEventTypes.map((ty) => (
                      <SelectItem key={ty} value={ty}>
                        {ty}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-700">{t("audit.dashboard.filters.complianceType")}</Label>
                <Select
                  value={draftFilters.complianceEventType}
                  onValueChange={(v) => setDraftFilters((s) => ({ ...s, complianceEventType: v }))}
                >
                  <SelectTrigger className="border-slate-200 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectItem value="all">{t("common.all")}</SelectItem>
                    {dash.filterOptions.complianceEventTypes.map((ty) => (
                      <SelectItem key={ty} value={ty}>
                        {ty}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-700">{t("audit.dashboard.filters.dateFrom")}</Label>
                <Input
                  type="date"
                  className="border-slate-200 bg-white"
                  value={draftFilters.dateFrom}
                  onChange={(e) => setDraftFilters((s) => ({ ...s, dateFrom: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-700">{t("audit.dashboard.filters.dateTo")}</Label>
                <Input
                  type="date"
                  className="border-slate-200 bg-white"
                  value={draftFilters.dateTo}
                  onChange={(e) => setDraftFilters((s) => ({ ...s, dateTo: e.target.value }))}
                />
              </div>
              <div className="flex flex-wrap items-end gap-2 md:col-span-2 xl:col-span-1">
                <Button type="button" className="bg-brand-navy hover:bg-brand-navy/90" onClick={applyFilters}>
                  {t("audit.dashboard.filters.apply")}
                </Button>
                <Button type="button" variant="ghost" onClick={resetFilters}>
                  {t("audit.dashboard.filters.reset")}
                </Button>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-inner">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-200 bg-slate-50/90 hover:bg-slate-50/90">
                  <TableHead className="font-bold text-brand-navy">{t("audit.dashboard.table.worker")}</TableHead>
                  <TableHead className="font-bold text-brand-navy">{t("audit.dashboard.table.risk")}</TableHead>
                  <TableHead className="font-bold text-brand-navy">{t("audit.dashboard.table.status")}</TableHead>
                  <TableHead className="font-bold text-brand-navy">{t("audit.dashboard.table.visaExpiry")}</TableHead>
                  <TableHead className="font-bold text-brand-navy">{t("audit.dashboard.table.missingDocs")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingWorkers ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-slate-500">
                      {t("audit.dashboard.table.loading")}
                    </TableCell>
                  </TableRow>
                ) : workers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-12 text-center">
                      <p className="text-sm font-medium text-slate-600">{t("audit.dashboard.table.empty")}</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  workers.map((w) => (
                    <TableRow key={w.id} className="border-slate-100 hover:bg-brand-navy/[0.03]">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-navy/15 to-brand-navy/5 text-xs font-bold text-brand-navy ring-1 ring-brand-navy/15"
                            aria-hidden
                          >
                            {workerInitials(w.firstName, w.lastName)}
                          </div>
                          <div className="min-w-0">
                            <Link
                              href={`/workers/${w.id}`}
                              className="block truncate font-semibold text-brand-navy underline decoration-brand-navy/25 underline-offset-2 hover:decoration-brand-navy"
                            >
                              {w.firstName} {w.lastName}
                            </Link>
                            <p className="truncate text-xs text-slate-500">{w.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <RiskLevelBadge level={w.complianceRiskLevel} t={t} />
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-medium text-slate-700">{w.employmentStatus}</span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-slate-700">
                        {w.visaExpiryDate ? fmtShort(w.visaExpiryDate, localeTag) : "—"}
                      </TableCell>
                      <TableCell>
                        {w.missingDocumentCount > 0 ? (
                          <Link href={`/workers/${w.id}/documents`}>
                            <span
                              className={cn(
                                "inline-flex min-w-[2rem] items-center justify-center rounded-full border px-2.5 py-1 text-xs font-bold tabular-nums shadow-sm",
                                w.missingHigh > 0
                                  ? "border-red-500 bg-red-600 text-white ring-2 ring-red-400/40"
                                  : "border-orange-400 bg-orange-50 text-orange-950"
                              )}
                            >
                              {w.missingDocumentCount}
                            </span>
                          </Link>
                        ) : (
                          <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold tabular-nums text-slate-600">
                            0
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function RiskLevelBadge(props: {
  level: ComplianceRiskLevel;
  t: (key: string) => string;
}): JSX.Element {
  const skin = {
    LOW: "border-emerald-300 bg-emerald-50 text-emerald-950 shadow-sm",
    MEDIUM: "border-amber-300 bg-amber-50 text-amber-950 shadow-sm",
    HIGH: "border-orange-400 bg-orange-50 text-orange-950 shadow-sm",
    CRITICAL: "border-red-500 bg-red-50 text-red-950 shadow-[0_0_0_1px_rgba(220,38,38,0.15)]",
  }[props.level];
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide",
        skin
      )}
    >
      {props.t(`audit.dashboard.risk.${props.level}`)}
    </span>
  );
}

type GlanceSentiment = "neutral" | "positive" | "caution" | "critical";

function GlanceStat(props: {
  icon: LucideIcon;
  label: string;
  hint: string;
  value: number;
  sentiment: GlanceSentiment;
}): JSX.Element {
  const Icon = props.icon;
  const skin = {
    neutral: "from-slate-50 to-white border-slate-200/90 ring-slate-100 text-brand-navy",
    positive: "from-emerald-50/80 to-white border-emerald-200/70 ring-emerald-100/80 text-emerald-950",
    caution: "from-amber-50/90 to-white border-amber-200/80 ring-amber-100/90 text-amber-950",
    critical: "from-red-50/90 to-white border-red-200/90 ring-red-100/80 text-red-950",
  }[props.sentiment];
  const iconWrap = {
    neutral: "bg-brand-navy/10 text-brand-navy",
    positive: "bg-emerald-600/15 text-emerald-800",
    caution: "bg-amber-500/15 text-amber-900",
    critical: "bg-red-600/15 text-red-800",
  }[props.sentiment];

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border bg-gradient-to-br p-5 shadow-md ring-1 transition-shadow hover:shadow-lg",
        skin
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{props.label}</p>
          <p className="text-3xl font-bold tabular-nums tracking-tight">{props.value}</p>
          <p className="text-xs text-slate-600">{props.hint}</p>
        </div>
        <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", iconWrap)}>
          <Icon className="h-5 w-5" aria-hidden />
        </div>
      </div>
    </div>
  );
}

function ActionQueueCard(props: {
  title: string;
  empty: string;
  columns: string[];
  rows: { key: string; cells: (string | JSX.Element)[] }[];
}): JSX.Element {
  return (
    <Card className="min-w-0 overflow-hidden border-slate-200/90 shadow-md ring-1 ring-slate-100">
      <CardHeader className="border-b border-slate-100 bg-slate-50/80 py-4">
        <CardTitle className="text-sm font-bold text-brand-navy">{props.title}</CardTitle>
      </CardHeader>
      <CardContent className="max-h-[340px] overflow-auto p-0">
        {props.rows.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-slate-500">{props.empty}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-slate-100 hover:bg-transparent">
                {props.columns.map((c) => (
                  <TableHead key={c} className="whitespace-nowrap text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    {c}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {props.rows.map((r) => (
                <TableRow key={r.key} className="border-slate-100">
                  {r.cells.map((c, i) => (
                    <TableCell key={i} className="max-w-[160px] align-top text-xs text-slate-700">
                      <div className="break-words">{c}</div>
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function MissingDocumentsCard(props: {
  title: string;
  empty: string;
  items: Array<{
    workerId: string;
    name: string;
    labels: string[];
    highCount: number;
    mediumCount: number;
    lowCount: number;
  }>;
  totalLabel: string;
  priorityHint: string;
  documentsLabel: string;
}): JSX.Element {
  const totalGaps = (i: { highCount: number; mediumCount: number; lowCount: number }) =>
    i.highCount + i.mediumCount + i.lowCount;

  return (
    <Card className="min-w-0 overflow-hidden border-slate-200/90 shadow-md ring-1 ring-slate-100">
      <CardHeader className="border-b border-slate-100 bg-slate-50/80 py-4">
        <CardTitle className="text-sm font-bold text-brand-navy">{props.title}</CardTitle>
      </CardHeader>
      <CardContent className="max-h-[340px] space-y-0 overflow-auto p-0">
        {props.items.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-slate-500">{props.empty}</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {props.items.map((item) => (
              <li key={item.workerId} className="px-4 py-4 hover:bg-brand-navy/[0.02]">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/workers/${item.workerId}`}
                        className="truncate text-sm font-bold text-brand-navy underline decoration-brand-navy/30 underline-offset-2 hover:decoration-brand-navy"
                      >
                        {item.name}
                      </Link>
                      <span className="inline-flex items-center rounded-full border border-red-500 bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
                        {totalGaps(item)} {props.totalLabel}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      {item.highCount} / {item.mediumCount} / {item.lowCount} — {props.priorityHint}
                    </p>
                    <p className="line-clamp-2 text-xs leading-relaxed text-slate-600">
                      {item.labels.slice(0, 4).join(" · ")}
                      {item.labels.length > 4 ? "…" : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                    <Link
                      href={`/workers/${item.workerId}/documents`}
                      className="text-xs font-bold text-brand-navy underline decoration-brand-navy/30 underline-offset-2 hover:decoration-brand-navy"
                    >
                      {props.documentsLabel} →
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function fmtShort(iso: string, localeTag: string): string {
  return new Date(iso).toLocaleDateString(localeTag, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function AuditDashboardFallback(): JSX.Element {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-[38vh] items-center justify-center text-slate-600">{t("common.loading")}</div>
  );
}

export default function AuditDashboardPage(): JSX.Element {
  return (
    <Suspense fallback={<AuditDashboardFallback />}>
      <AuditDashboardContent />
    </Suspense>
  );
}
