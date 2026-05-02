"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  Building2,
  FileClock,
  FileSpreadsheet,
  Plane,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AuditActivityFeed } from "@/components/compliance/AuditActivityFeed";
import type { AuditLogFeedItem } from "@/lib/compliance/audit-feed";
import { useTranslation } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

type Summary = {
  totalActiveWorkers: number;
  pendingReports: number;
  overdueReports: number;
  visasExpiring30d: number;
  documentsExpiring30d: number;
  openOrganisationChanges: number;
  recentAuditLogs: AuditLogFeedItem[];
};

type PayrollSummary = {
  dataRows: number;
  headerRowsSkipped: number;
  malformedRows: number;
  unmatchedEmails: number;
  matchedNoDiscrepancy: number;
};

export default function CompliancePage(): JSX.Element | null {
  const { t, locale } = useTranslation();
  const localeTag = locale === "tr" ? "tr-TR" : "en-GB";

  const [data, setData] = useState<Summary | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<{
    discrepanciesFound: number;
    rowsSummary?: PayrollSummary;
    discrepancies: { workerId: string; expected: number; actual: number }[];
  } | null>(null);

  const reload = useCallback(async (opts?: { silent?: boolean }): Promise<void> => {
    const silent = Boolean(opts?.silent);
    try {
      if (!silent) setLoading(true);
      const res = await fetch("/api/compliance/summary", { credentials: "include" });
      if (!res.ok) {
        setErr(t("common.errorLoad"));
        return;
      }
      const j = (await res.json()) as { data: Summary };
      setData(j.data);
      setErr(null);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void reload();
  }, [reload]);

  if (loading && !data) {
    return (
      <div className="flex min-h-[38vh] items-center justify-center text-slate-600">
        {t("common.loading")}
      </div>
    );
  }

  if (err) {
    return (
      <div className="space-y-3">
        <p className="text-red-700">{err}</p>
        <Button type="button" variant="outline" onClick={() => void reload({ silent: false })}>
          {t("common.retry")}
        </Button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-brand-navy md:text-3xl">
            {t("compliance.page.title")}
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-slate-600">{t("compliance.page.subtitle")}</p>
        </div>
        <Button
          variant="outline"
          className="h-11 shrink-0 gap-2 border-brand-navy/25 font-semibold text-brand-navy shadow-sm hover:bg-brand-navy/[0.04]"
          asChild
        >
          <Link href="/compliance/audit">
            <span>{t("compliance.page.auditPackCta")}</span>
            <ArrowUpRight className="h-4 w-4" aria-hidden />
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <ComplianceStatCard
          label={t("compliance.stat.activeWorkers")}
          value={data.totalActiveWorkers}
          icon={Users}
          tone="primary"
          trendFlag={undefined}
          trendLabel={t("compliance.stat.reviewCue")}
        />
        <ComplianceStatCard
          label={t("compliance.stat.pendingReports")}
          value={data.pendingReports}
          icon={FileClock}
          tone="warn"
          trendFlag={data.pendingReports > 0}
          trendLabel={t("compliance.stat.reviewCue")}
        />
        <ComplianceStatCard
          label={t("compliance.stat.overdueReports")}
          value={data.overdueReports}
          icon={AlertTriangle}
          tone="danger"
          trendFlag={data.overdueReports > 0}
          trendLabel={t("compliance.stat.reviewCue")}
        />
        <ComplianceStatCard
          label={t("compliance.stat.visas30d")}
          value={data.visasExpiring30d}
          icon={Plane}
          tone="accent"
          trendFlag={data.visasExpiring30d > 0}
          trendLabel={t("compliance.stat.reviewCue")}
        />
        <ComplianceStatCard
          label={t("compliance.stat.docs30d")}
          value={data.documentsExpiring30d}
          icon={FileSpreadsheet}
          tone="accentAlt"
          trendFlag={data.documentsExpiring30d > 0}
          trendLabel={t("compliance.stat.reviewCue")}
        />
        <ComplianceStatCard
          label={t("compliance.stat.orgChanges")}
          value={data.openOrganisationChanges}
          icon={Building2}
          tone="slate"
          trendFlag={data.openOrganisationChanges > 0}
          trendLabel={t("compliance.stat.reviewCue")}
        />
      </div>

      <Card className="overflow-hidden border-brand-navy/10 shadow-lg ring-1 ring-slate-100">
        <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-brand-navy/[0.04] via-white to-slate-50/80">
          <CardTitle className="text-xl text-brand-navy">{t("compliance.feed.title")}</CardTitle>
          <CardDescription className="text-sm">{t("compliance.feed.subtitle")}</CardDescription>
        </CardHeader>
        <CardContent className="py-8">
          <AuditActivityFeed items={data.recentAuditLogs} localeTag={localeTag} />
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-slate-200/90 shadow-md ring-1 ring-amber-200/35">
        <CardHeader className="border-b border-amber-100/80 bg-gradient-to-r from-amber-50/80 to-white">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-brand-navy">{t("compliance.payroll.title")}</CardTitle>
              <CardDescription className="mt-1 max-w-3xl text-slate-600">
                {t("compliance.payroll.subtitle")}
              </CardDescription>
            </div>
            <FileSpreadsheet className="h-8 w-8 text-amber-700/70" aria-hidden />
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="rounded-xl border border-slate-200/90 bg-slate-50/80 p-5 shadow-inner ring-1 ring-slate-100">
            <p className="text-xs font-bold uppercase tracking-wider text-brand-navy/80">
              {t("compliance.payroll.formatTitle")}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-slate-700">{t("compliance.payroll.formatBody")}</p>
            <code className="mt-4 block rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs text-slate-800 shadow-sm">
              email,expectedAnnual,actualAnnual
            </code>
          </div>
          <div className="space-y-2">
            <Label htmlFor="payroll-csv" className="text-slate-800">
              {t("compliance.payroll.chooseFile")}
            </Label>
            <Input
              id="payroll-csv"
              type="file"
              accept=".csv,text/csv"
              disabled={uploading}
              className="cursor-pointer border-slate-200 bg-white file:mr-3 file:rounded-md file:border file:border-slate-200 file:bg-brand-navy/5 file:px-3 file:py-2 file:text-sm file:font-medium file:text-brand-navy hover:file:bg-brand-navy/10"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setUploadError(null);
                setUploadResult(null);
                setUploading(true);

                const reader = new FileReader();
                reader.onload = async () => {
                  const csv = typeof reader.result === "string" ? reader.result : "";
                  if (!csv.trim()) {
                    setUploadError(locale === "tr" ? "Dosya boş görünüyor." : "File appears empty.");
                    setUploading(false);
                    return;
                  }
                  try {
                    const res = await fetch("/api/payroll/upload", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      credentials: "include",
                      body: JSON.stringify({ csv }),
                    });
                    const json = (await res.json()) as {
                      error?: string;
                      data?: {
                        discrepanciesFound?: number;
                        discrepancies?: { workerId: string; expected: number; actual: number }[];
                        rowsSummary?: PayrollSummary;
                      };
                    };
                    if (!res.ok) {
                      setUploadError(json.error ?? t("compliance.payroll.uploadFailed"));
                      return;
                    }
                    setUploadResult({
                      discrepanciesFound: json.data?.discrepanciesFound ?? 0,
                      rowsSummary: json.data?.rowsSummary,
                      discrepancies: json.data?.discrepancies ?? [],
                    });
                    void reload({ silent: true });
                  } catch {
                    setUploadError(locale === "tr" ? "Yükleme sırasında hata oluştu." : "Upload failed unexpectedly.");
                  } finally {
                    setUploading(false);
                    e.target.value = "";
                  }
                };
                reader.onerror = () => {
                  setUploadError(locale === "tr" ? "Dosya okunamadı." : "Could not read file.");
                  setUploading(false);
                  e.target.value = "";
                };
                reader.readAsText(file);
              }}
            />
          </div>
          {uploading ? (
            <p className="text-sm font-medium text-brand-navy">{t("compliance.payroll.uploading")}</p>
          ) : null}
          {uploadError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              <p className="font-semibold">{locale === "tr" ? "Hata günlüğü" : "Error"}</p>
              <p className="mt-1">{uploadError}</p>
            </div>
          ) : null}
          {uploadResult?.rowsSummary != null ? (
            <div className="space-y-4 rounded-xl border border-emerald-200/70 bg-emerald-50/50 p-5 shadow-inner">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-lg text-emerald-950">{t("compliance.payroll.successTitle")}</CardTitle>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <MiniStat label={t("compliance.payroll.rowsProcessed")} value={uploadResult.rowsSummary.dataRows} />
                <MiniStat label={t("compliance.payroll.headersSkipped")} value={uploadResult.rowsSummary.headerRowsSkipped} />
                <MiniStat label={t("compliance.payroll.matchedNoIssue")} value={uploadResult.rowsSummary.matchedNoDiscrepancy} />
                <MiniStat label={t("compliance.payroll.discrepancies")} value={uploadResult.discrepanciesFound} highlight />
                <MiniStat label={t("compliance.payroll.workerNotFound")} value={uploadResult.rowsSummary.unmatchedEmails} warning />
                <MiniStat label={t("compliance.payroll.malformedRows")} value={uploadResult.rowsSummary.malformedRows} warning />
              </div>
              {uploadResult.discrepancies.length > 0 ? (
                <div className="max-h-40 overflow-auto rounded-lg border border-emerald-200/70 bg-white/90 p-3 text-xs font-mono text-slate-800 shadow-sm">
                  {uploadResult.discrepancies.slice(0, 40).map((d) => (
                    <div key={`${d.workerId}-${d.expected}-${d.actual}`} className="border-b border-slate-100 py-1 last:border-0">
                      {d.workerId} · expected {d.expected} · actual {d.actual}
                    </div>
                  ))}
                  {uploadResult.discrepancies.length > 40 ? (
                    <p className="pt-2 text-slate-500">…</p>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm text-emerald-900">{t("compliance.payroll.noDiscrepancyLine")}</p>
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function MiniStat(props: {
  label: string;
  value: number;
  highlight?: boolean;
  warning?: boolean;
}): JSX.Element {
  const { label, value, highlight, warning } = props;
  return (
    <div
      className={cn(
        "rounded-lg border border-slate-200/90 bg-white px-4 py-3 shadow-sm ring-1 ring-slate-100",
        highlight && "border-emerald-400/50 bg-emerald-50",
        warning && value > 0 && "border-amber-400/70 bg-amber-50"
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-brand-navy">{value}</p>
    </div>
  );
}

function ComplianceStatCard(props: {
  label: string;
  value: number;
  icon: LucideIcon;
  trendFlag?: boolean;
  trendLabel: string;
  tone: "primary" | "warn" | "danger" | "accent" | "accentAlt" | "slate";
}): JSX.Element {
  const { label, value, icon: Icon, tone, trendFlag, trendLabel } = props;

  const skin = {
    primary: {
      wrap: "from-brand-navy/[0.07] to-white ring-brand-navy/15",
      icon: "bg-brand-navy text-white shadow-md shadow-brand-navy/20",
    },
    warn: {
      wrap: "from-amber-50/90 to-white ring-amber-200/70",
      icon: "bg-amber-500 text-white shadow-md shadow-amber-400/25",
    },
    danger: {
      wrap: "from-rose-50/90 to-white ring-rose-200/70",
      icon: "bg-rose-600 text-white shadow-md shadow-rose-500/20",
    },
    accent: {
      wrap: "from-sky-50/80 to-white ring-sky-200/70",
      icon: "bg-sky-600 text-white shadow-md shadow-sky-500/25",
    },
    accentAlt: {
      wrap: "from-violet-50/75 to-white ring-violet-200/65",
      icon: "bg-violet-600 text-white shadow-md shadow-violet-500/25",
    },
    slate: {
      wrap: "from-slate-100/80 to-white ring-slate-200/70",
      icon: "bg-slate-800 text-white shadow-md shadow-slate-900/15",
    },
  }[tone];

  const valueClass =
    tone === "danger" && value > 0
      ? "text-rose-700"
      : tone === "warn" && value > 0
        ? "text-amber-700"
        : "text-brand-navy";

  return (
    <Card
      className={cn(
        "overflow-hidden border-0 bg-gradient-to-br shadow-md ring-1 ring-inset ring-transparent",
        skin.wrap
      )}
    >
      <CardContent className="relative p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-600">{label}</p>
            <p className={cn("text-3xl font-bold tabular-nums tracking-tight", valueClass)}>{value}</p>
          </div>
          <span
            className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl",
              skin.icon
            )}
          >
            <Icon className="h-6 w-6" aria-hidden />
          </span>
        </div>
        {trendFlag ? (
          <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-amber-900">
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
            {trendLabel}
          </span>
        ) : null}
      </CardContent>
    </Card>
  );
}
