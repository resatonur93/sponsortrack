"use client";

import { useEffect, useState } from "react";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { RiskBadge } from "@/components/dashboard/RiskBadge";
import { RecentEvents } from "@/components/dashboard/RecentEvents";
import type { RiskResult } from "@/lib/risk-score";
import type {
  AlertLevel,
  AlertType,
  NotificationType,
  RiskLevel,
} from "@prisma/client";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { AlertLevelDot } from "@/components/layout/AlertCountPill";
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

type DashboardPayload = {
  stats: {
    totalWorkers: number;
    activeSponsorships: number;
    pendingNotifications: number;
    overdueNotifications: number;
    missingDocumentIssues: number;
  };
  highPriorityMissing: {
    workerId: string;
    name: string;
    labels: string[];
  }[];
  missingDocumentsTable: {
    workerId: string;
    name: string;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    labels: string[];
  }[];
  risk: RiskResult;
  recentEvents: {
    id: string;
    eventType: NotificationType;
    status: string;
    dueDate: string;
    createdAt?: string;
    worker: { firstName: string; lastName: string; id: string };
  }[];
  recentAlerts: {
    id: string;
    level: AlertLevel;
    alertType: AlertType;
    message: string;
    isRead: boolean;
    worker: { id: string; firstName: string; lastName: string } | null;
  }[];
};

type RiskEngineSummary = {
  byLevel: Record<RiskLevel, number>;
  workerScores: number;
  lastCalculatedAt: string | null;
};

export default function DashboardPage(): JSX.Element {
  const { t, locale } = useTranslation();
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [retryTick, setRetryTick] = useState(0);
  const [riskEngine, setRiskEngine] = useState<RiskEngineSummary | null>(null);
  const localeTag = locale === "tr" ? "tr-TR" : "en-GB";

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoadFailed(false);
      const res = await fetch("/api/dashboard", {
        credentials: "include",
        cache: "no-store",
      });
      if (cancelled) return;
      if (!res.ok) {
        setLoadFailed(true);
        setData(null);
        return;
      }
      const json = (await res.json()) as { data: DashboardPayload };
      setData(json.data);
    })();
    return () => {
      cancelled = true;
    };
  }, [retryTick]);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/risk-scores/summary", {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) return;
      const json = (await res.json()) as { data: RiskEngineSummary };
      setRiskEngine(json.data);
    })();
  }, []);

  if (loadFailed) {
    return (
      <div
        role="alert"
        className="mx-auto max-w-lg rounded-xl border border-red-200 bg-red-50 p-6 shadow-sm"
      >
        <h1 className="text-lg font-semibold text-red-900">{t("common.errorLoad")}</h1>
        <p className="mt-2 text-sm text-red-800/90">{t("dashboard.retryHint")}</p>
        <Button
          type="button"
          variant="outline"
          className="mt-4 border-red-300 bg-white text-red-900 hover:bg-red-100"
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
          <div className="h-9 w-48 animate-pulse rounded-md bg-slate-200" />
          <div className="h-5 w-full max-w-xl animate-pulse rounded-md bg-slate-100" />
        </div>
        <p className="text-sm text-slate-600">{t("dashboard.loadingHint")}</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-lg border border-slate-100 bg-white"
            />
          ))}
        </div>
        <div className="h-40 animate-pulse rounded-lg border border-slate-100 bg-white" />
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="h-48 animate-pulse rounded-lg border border-slate-100 bg-white" />
          <div className="h-48 animate-pulse rounded-lg border border-slate-100 bg-white" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-brand-navy">{t("dashboard.title")}</h1>
        <p className="text-slate-600">{t("dashboard.subtitle")}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatsCard title={t("dashboard.totalWorkers")} value={data.stats.totalWorkers} />
        <StatsCard
          title={t("dashboard.activeSponsorships")}
          value={data.stats.activeSponsorships}
        />
        <StatsCard
          title={t("dashboard.pendingNotifications")}
          value={data.stats.pendingNotifications}
        />
        <StatsCard
          title={t("dashboard.overdueNotifications")}
          value={data.stats.overdueNotifications}
        />
        <StatsCard
          title={t("dashboard.missingDocs")}
          value={data.stats.missingDocumentIssues ?? 0}
        />
      </div>

      {riskEngine ? (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-slate-900">
              {t("dashboard.riskEngine")}
            </h2>
            <Link
              href="/risk-report"
              className="text-sm font-medium text-brand-navy underline"
            >
              {t("dashboard.riskEngineFullRanking")}
            </Link>
          </div>
          {riskEngine.workerScores === 0 ? (
            <p className="text-sm text-slate-600">
              {t("dashboard.riskEngineEmptyBefore")}
              <code className="text-xs">/api/cron/risk-scores</code>
              {t("dashboard.riskEngineEmptyAfter")}
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(
                ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as RiskLevel[]
              ).map((lvl) => (
                <div
                  key={lvl}
                  className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2"
                >
                  <p className="text-xs font-medium text-slate-500">
                    {t(`risk.${lvl}`)}
                  </p>
                  <p className="text-lg font-semibold tabular-nums text-brand-navy">
                    {riskEngine.byLevel[lvl]}
                  </p>
                </div>
              ))}
            </div>
          )}
          {riskEngine.lastCalculatedAt ? (
            <p className="mt-2 text-xs text-slate-500">
              {t("dashboard.lastCalculated")}{" "}
              {new Date(riskEngine.lastCalculatedAt).toLocaleString(localeTag)}
            </p>
          ) : null}
        </div>
      ) : null}

      {data.highPriorityMissing && data.highPriorityMissing.length > 0 ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <h2 className="text-sm font-semibold text-red-900">
            {t("dashboard.highPriorityMissing")}
          </h2>
          <ul className="mt-2 space-y-1 text-sm">
            {data.highPriorityMissing.map((h) => (
              <li key={h.workerId}>
                <Link
                  href={`/workers/${h.workerId}`}
                  className="font-medium text-brand-navy underline"
                >
                  {h.name}
                </Link>
                : {h.labels.join(", ")}
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

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">
            {t("dashboard.alerts")}
          </h2>
          <Link href="/alerts" className="text-sm text-brand-navy underline">
            {t("dashboard.alertsAll")}
          </Link>
        </div>
        {!data.recentAlerts?.length ? (
          <p className="text-sm text-slate-500">{t("dashboard.noAlerts")}</p>
        ) : (
          <ul className="space-y-2">
            {data.recentAlerts.map((a) => (
              <li
                key={a.id}
                className="flex gap-2 text-sm text-slate-800"
              >
                <AlertLevelDot level={a.level} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {a.alertType}
                    </Badge>
                    {a.worker ? (
                      <Link
                        href={`/workers/${a.worker.id}`}
                        className="font-medium text-brand-navy underline"
                      >
                        {a.worker.firstName} {a.worker.lastName}
                      </Link>
                    ) : null}
                    {!a.isRead ? (
                      <span className="text-xs font-medium text-red-600">
                        {t("dashboard.newBadge")}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-slate-600">{a.message}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">
            {t("dashboard.missingDocTracking")}
          </h2>
          <span className="text-xs text-slate-500">
            {data.missingDocumentsTable?.length ?? 0}{" "}
            {t("dashboard.missingDocListed")}
          </span>
        </div>
        {!data.missingDocumentsTable || data.missingDocumentsTable.length === 0 ? (
          <p className="text-sm text-slate-500">{t("dashboard.noMissingDocs")}</p>
        ) : (
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
        )}
      </div>
      <RecentEvents events={data.recentEvents} />
    </div>
  );
}
