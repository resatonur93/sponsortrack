"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { ComplianceRiskLevel } from "@prisma/client";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

const RISK_COLORS: Record<ComplianceRiskLevel, string> = {
  LOW: "#22c55e",
  MEDIUM: "#eab308",
  HIGH: "#f97316",
  CRITICAL: "#dc2626",
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

function buildQueryParams(
  f: FilterState,
  extra: Record<string, string>
): string {
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

function riskBadgeVariant(
  r: ComplianceRiskLevel
): "success" | "warning" | "danger" | "outline" {
  switch (r) {
    case "LOW":
      return "success";
    case "MEDIUM":
      return "warning";
    case "HIGH":
      return "danger";
    case "CRITICAL":
      return "danger";
    default:
      return "outline";
  }
}

export default function AuditDashboardPage(): JSX.Element {
  const [dash, setDash] = useState<AuditDashboardPayload | null>(null);
  const [workers, setWorkers] = useState<WorkerRow[]>([]);
  const [filters, setFilters] = useState<FilterState>(emptyFilters);
  const [applied, setApplied] = useState<FilterState>(emptyFilters);
  const [loadingDash, setLoadingDash] = useState(true);
  const [loadingWorkers, setLoadingWorkers] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDash = useCallback(async (): Promise<void> => {
    setLoadingDash(true);
    setError(null);
    try {
      const res = await fetch("/api/audit/dashboard", {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) {
        setError("Dashboard verisi yüklenemedi.");
        return;
      }
      const json = (await res.json()) as { data: AuditDashboardPayload };
      setDash(json.data);
    } finally {
      setLoadingDash(false);
    }
  }, []);

  const loadWorkers = useCallback(async (f: FilterState): Promise<void> => {
    setLoadingWorkers(true);
    setError(null);
    try {
      const q = buildQueryParams(f, { limit: "200" });
      const res = await fetch(`/api/audit/workers?${q}`, {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) {
        setError("Çalışan listesi yüklenemedi.");
        return;
      }
      const json = (await res.json()) as { data: WorkerRow[] };
      setWorkers(json.data);
    } finally {
      setLoadingWorkers(false);
    }
  }, []);

  useEffect(() => {
    void loadDash();
  }, [loadDash]);

  useEffect(() => {
    void loadWorkers(applied);
  }, [applied, loadWorkers]);

  const pieData = useMemo(() => {
    if (!dash) return [];
    return (
      Object.entries(dash.riskSummary) as [ComplianceRiskLevel, number][]
    ).map(([name, value]) => ({
      name,
      value,
      fill: RISK_COLORS[name],
    }));
  }, [dash]);

  const barData = useMemo(() => {
    if (!dash) return [];
    return (
      Object.entries(dash.riskSummary) as [ComplianceRiskLevel, number][]
    ).map(([level, count]) => ({ level, count }));
  }, [dash]);

  const csvHref = `/api/audit/export?${buildQueryParams(applied, { format: "csv" })}`;
  const pdfHref = `/api/audit/export?${buildQueryParams(applied, { format: "pdf" })}`;

  function applyFilters(): void {
    setApplied({ ...filters });
  }

  function resetFilters(): void {
    setFilters(emptyFilters);
    setApplied(emptyFilters);
  }

  if (loadingDash && !dash) {
    return <p className="text-slate-600">Yükleniyor…</p>;
  }
  if (error && !dash) {
    return <p className="text-red-600">{error}</p>;
  }
  if (!dash) {
    return <p className="text-slate-600">Veri yok.</p>;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy">Audit Dashboard</h1>
          <p className="text-sm text-slate-600">
            Compliance officer overview — stats, risk, actions, and filtered
            workers.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" asChild>
            <a href={csvHref}>Export CSV</a>
          </Button>
          <Button type="button" variant="outline" size="sm" asChild>
            <a href={pdfHref}>Export PDF</a>
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => void loadDash()}
            disabled={loadingDash}
          >
            Refresh
          </Button>
        </div>
      </div>

      {error ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {error}
        </p>
      ) : null}

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          At-a-glance
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <StatCard
            label="Total sponsored workers"
            value={dash.stats.totalSponsoredWorkers}
          />
          <StatCard
            label="Active sponsorships"
            value={dash.stats.activeSponsorships}
          />
          <StatCard
            label="Visas expiring ≤30d"
            value={dash.stats.visasExpiring30d}
            warn
          />
          <StatCard
            label="Visas expiring ≤90d"
            value={dash.stats.visasExpiring90dWindow}
            warn
          />
          <StatCard
            label="Overdue reports"
            value={dash.stats.overdueReports}
            danger
          />
          <StatCard
            label="Workers with missing docs"
            value={dash.stats.missingDocumentsWorkers}
            danger
          />
          <StatCard
            label="Salary anomalies (records)"
            value={dash.stats.salaryAnomalyRecords}
          />
          <StatCard
            label="Salary anomalies (workers)"
            value={dash.stats.salaryAnomalyWorkers}
          />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Risk summary</CardTitle>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={88}
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Risk by level</CardTitle>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ left: 8, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200" />
                <XAxis dataKey="level" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {barData.map((entry) => (
                    <Cell key={entry.level} fill={RISK_COLORS[entry.level]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Action required
        </h2>
        <div className="grid gap-4 lg:grid-cols-3">
          <ActionTable
            title="Overdue items"
            empty="No overdue items."
            rows={dash.actionRequired.overdueItems.map((r) => ({
              key: `${r.kind}-${r.id}`,
              cols: [
                r.kind,
                r.type,
                <Link
                  key="l"
                  href={`/workers/${r.workerId}`}
                  className="text-brand-navy underline"
                >
                  {r.workerName}
                </Link>,
                fmtShort(r.deadline),
                r.status,
              ],
            }))}
          />
          <ActionTable
            title="Upcoming deadlines (7 days)"
            empty="No deadlines in the next 7 days."
            rows={dash.actionRequired.upcomingDeadlines7d.map((r) => ({
              key: `${r.kind}-${r.id}`,
              cols: [
                r.kind,
                r.type,
                <Link
                  key="l"
                  href={`/workers/${r.workerId}`}
                  className="text-brand-navy underline"
                >
                  {r.workerName}
                </Link>,
                fmtShort(r.deadline),
                r.status,
              ],
            }))}
          />
          <ActionTable
            title="Missing documents"
            empty="No missing-document gaps."
            rows={dash.actionRequired.missingDocuments.map((r) => ({
              key: r.workerId,
              cols: [
                <Link
                  key="l"
                  href={`/workers/${r.workerId}`}
                  className="font-medium text-brand-navy underline"
                >
                  {r.name}
                </Link>,
                `${r.highCount} high / ${r.mediumCount} med / ${r.lowCount} low`,
                r.labels.slice(0, 2).join(", ") +
                  (r.labels.length > 2 ? "…" : ""),
              ],
            }))}
            narrow
          />
        </div>
      </section>

      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">Workers (filtered)</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" asChild>
              <a href={csvHref}>CSV with filters</a>
            </Button>
            <Button type="button" variant="outline" size="sm" asChild>
              <a href={pdfHref}>PDF with filters</a>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <div className="space-y-1">
              <Label>Search</Label>
              <Input
                value={filters.search}
                onChange={(e) =>
                  setFilters((s) => ({ ...s, search: e.target.value }))
                }
                placeholder="Name or email"
              />
            </div>
            <div className="space-y-1">
              <Label>Worker ID</Label>
              <Input
                value={filters.workerId}
                onChange={(e) =>
                  setFilters((s) => ({ ...s, workerId: e.target.value }))
                }
                placeholder="cuid…"
              />
            </div>
            <div className="space-y-1">
              <Label>Risk level</Label>
              <Select
                value={filters.riskLevel}
                onValueChange={(v) =>
                  setFilters((s) => ({ ...s, riskLevel: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {(Object.keys(RISK_COLORS) as ComplianceRiskLevel[]).map(
                    (r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Notification event type</Label>
              <Select
                value={filters.notificationEventType}
                onValueChange={(v) =>
                  setFilters((s) => ({ ...s, notificationEventType: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value="all">All</SelectItem>
                  {dash.filterOptions.notificationEventTypes.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Compliance event type</Label>
              <Select
                value={filters.complianceEventType}
                onValueChange={(v) =>
                  setFilters((s) => ({ ...s, complianceEventType: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value="all">All</SelectItem>
                  {dash.filterOptions.complianceEventTypes.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Date from</Label>
              <Input
                type="date"
                value={filters.dateFrom}
                onChange={(e) =>
                  setFilters((s) => ({ ...s, dateFrom: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Date to</Label>
              <Input
                type="date"
                value={filters.dateTo}
                onChange={(e) =>
                  setFilters((s) => ({ ...s, dateTo: e.target.value }))
                }
              />
            </div>
            <div className="flex items-end gap-2">
              <Button type="button" onClick={applyFilters}>
                Apply filters
              </Button>
              <Button type="button" variant="ghost" onClick={resetFilters}>
                Reset
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Worker</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Visa expiry</TableHead>
                  <TableHead>Missing docs</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingWorkers ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-slate-500">
                      Loading…
                    </TableCell>
                  </TableRow>
                ) : workers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-slate-500">
                      No workers match filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  workers.map((w) => (
                    <TableRow key={w.id}>
                      <TableCell>
                        <Link
                          href={`/workers/${w.id}`}
                          className="font-medium text-brand-navy underline"
                        >
                          {w.firstName} {w.lastName}
                        </Link>
                        <div className="text-xs text-slate-500">{w.email}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={riskBadgeVariant(w.complianceRiskLevel)}>
                          {w.complianceRiskLevel}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{w.employmentStatus}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs">
                        {w.visaExpiryDate
                          ? fmtShort(w.visaExpiryDate)
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={w.missingHigh > 0 ? "danger" : "outline"}
                        >
                          {w.missingDocumentCount}
                        </Badge>
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

function StatCard(props: {
  label: string;
  value: number;
  warn?: boolean;
  danger?: boolean;
}): JSX.Element {
  return (
    <div
      className={`rounded-lg border bg-white p-4 shadow-sm ${
        props.danger
          ? "border-red-200"
          : props.warn
            ? "border-amber-200"
            : "border-slate-200"
      }`}
    >
      <p className="text-xs font-medium text-slate-500">{props.label}</p>
      <p
        className={`mt-1 text-2xl font-semibold tabular-nums ${
          props.danger
            ? "text-red-700"
            : props.warn
              ? "text-amber-800"
              : "text-brand-navy"
        }`}
      >
        {props.value}
      </p>
    </div>
  );
}

function ActionTable(props: {
  title: string;
  empty: string;
  rows: { key: string; cols: (string | JSX.Element)[] }[];
  narrow?: boolean;
}): JSX.Element {
  return (
    <Card className="min-w-0">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">{props.title}</CardTitle>
      </CardHeader>
      <CardContent className="max-h-[320px] overflow-auto p-0">
        {props.rows.length === 0 ? (
          <p className="px-4 py-6 text-sm text-slate-500">{props.empty}</p>
        ) : (
          <Table>
            <TableBody>
              {props.rows.map((r) => (
                <TableRow key={r.key}>
                  {r.cols.map((c, i) => (
                    <TableCell
                      key={i}
                      className={`text-xs ${props.narrow ? "max-w-[140px] truncate" : ""}`}
                    >
                      {c}
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

function fmtShort(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
