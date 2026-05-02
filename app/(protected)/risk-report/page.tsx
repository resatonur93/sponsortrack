"use client";

import { useCallback, useEffect, useState } from "react";
import { Gauge, FileDown, RefreshCw, Shield } from "lucide-react";
import { RiskScoresDataTable } from "@/components/risk/RiskScoresDataTable";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { RiskLevel } from "@prisma/client";
import { riskReportRowsToCsv, type RiskReportRow } from "@/lib/risk/report";
import { useTranslation } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

const LEVELS: RiskLevel[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

export default function RiskReportPage(): JSX.Element {
  const { t, locale } = useTranslation();
  const localeTag = locale === "tr" ? "tr-TR" : "en-GB";

  const [level, setLevel] = useState<string>("all");
  const [rows, setRows] = useState<RiskReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [recoiling, setRecoiling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    setBanner(null);
    setError(null);
    const q = level !== "all" ? `?level=${encodeURIComponent(level)}` : "";
    try {
      const res = await fetch(`/api/risk-scores${q}`, {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) {
        setError(t("risk.report.errorLoad"));
        return;
      }
      const json = (await res.json()) as { data: RiskReportRow[] };
      setRows(json.data);
    } finally {
      setLoading(false);
    }
  }, [level, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const recalculate = useCallback(async (): Promise<void> => {
    setRecoiling(true);
    setBanner(null);
    setError(null);
    try {
      const res = await fetch("/api/risk-scores/recalculate", {
        method: "POST",
        credentials: "include",
      });
      if (res.status === 403) {
        setBanner({ kind: "err", text: t("risk.report.forbiddenMutations") });
        return;
      }
      const json = (await res.json().catch(() => ({}))) as {
        workersProcessed?: number;
        error?: string;
      };
      if (!res.ok) {
        setBanner({
          kind: "err",
          text: json.error ?? t("risk.report.recalculateErr"),
        });
        return;
      }
      const count = json.workersProcessed ?? 0;
      setBanner({
        kind: "ok",
        text: t("risk.report.recalculateOk").replace(/\{\{\s*count\s*\}\}/g, String(count)),
      });
      await load();
    } catch {
      setBanner({ kind: "err", text: t("risk.report.recalculateErr") });
    } finally {
      setRecoiling(false);
    }
  }, [load, t]);

  function downloadCsv(): void {
    if (rows.length === 0) return;
    const csv = "\uFEFF" + riskReportRowsToCsv(rows, localeTag);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download =
      locale === "tr"
        ? `risk-raporu-${new Date().toISOString().slice(0, 10)}.csv`
        : `risk-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const showSkeleton = loading && rows.length === 0;
  const showEmptyHero = !loading && rows.length === 0 && !error;
  const hasData = rows.length > 0;

  return (
    <div className="mx-auto max-w-7xl space-y-10 pb-10">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <h1 className="text-2xl font-bold tracking-tight text-brand-navy md:text-3xl">
            {t("risk.report.title")}
          </h1>
          <p className="max-w-3xl text-sm leading-relaxed text-slate-600">{t("risk.report.subtitle")}</p>
        </div>

        <div className="flex w-full flex-col gap-4 sm:w-auto sm:flex-row sm:items-end sm:justify-end">
          <div className="w-full rounded-xl border-2 border-brand-navy/20 bg-gradient-to-br from-brand-navy/[0.04] to-white p-4 shadow-sm ring-1 ring-slate-100 sm:w-[260px]">
            <Label className="text-xs font-bold uppercase tracking-wide text-brand-navy/80">
              {t("risk.report.levelFilter")}
            </Label>
            <Select value={level} onValueChange={setLevel}>
              <SelectTrigger className="mt-2 h-11 border-brand-navy/20 bg-white font-semibold shadow-inner">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all")}</SelectItem>
                {LEVELS.map((l) => (
                  <SelectItem key={l} value={l}>
                    {t(`risk.report.riskLevel.${l}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="default"
              className="h-11 gap-2 bg-brand-navy px-5 font-bold shadow-md hover:bg-brand-navy/92 disabled:opacity-60"
              disabled={recoiling || loading}
              onClick={() => void recalculate()}
            >
              <RefreshCw className={cn("h-4 w-4", recoiling && "animate-spin")} aria-hidden />
              {recoiling ? t("risk.report.recalculateLoading") : t("risk.report.recalculate")}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11 gap-2 border-brand-navy/25 px-5 font-semibold"
              disabled={loading}
              onClick={() => void load()}
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} aria-hidden />
              {t("risk.report.refresh")}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11 gap-2 border-slate-200 px-5 font-semibold shadow-sm disabled:opacity-50"
              onClick={downloadCsv}
              disabled={!hasData || loading}
            >
              <FileDown className="h-4 w-4" aria-hidden />
              {t("risk.report.exportCsv")}
            </Button>
          </div>
        </div>
      </div>

      <Card className="border-slate-200/90 bg-gradient-to-r from-emerald-50/40 via-white to-amber-50/35 shadow-md ring-1 ring-slate-100">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-brand-navy/70" aria-hidden />
            <CardTitle className="text-base font-bold text-brand-navy">{t("risk.report.legendTitle")}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
          <p className="rounded-lg border border-emerald-200/70 bg-emerald-50/50 px-3 py-2">{t("risk.report.band.low")}</p>
          <p className="rounded-lg border border-amber-200/70 bg-amber-50/50 px-3 py-2">{t("risk.report.band.medium")}</p>
          <p className="rounded-lg border border-orange-200/80 bg-orange-50/50 px-3 py-2">{t("risk.report.band.high")}</p>
          <p className="rounded-lg border border-red-200/80 bg-red-50/60 px-3 py-2">{t("risk.report.band.critical")}</p>
        </CardContent>
      </Card>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-900">{error}</p>
      ) : null}

      {banner ? (
        <div
          className={cn(
            "rounded-xl border px-4 py-3 text-sm font-medium",
            banner.kind === "ok"
              ? "border-emerald-300 bg-emerald-50 text-emerald-950"
              : "border-amber-300 bg-amber-50 text-amber-950"
          )}
          role="status"
        >
          {banner.text}
        </div>
      ) : null}

      {showSkeleton ? (
        <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-white/70 py-16 text-slate-500">
          <RefreshCw className="h-8 w-8 animate-spin opacity-70" aria-hidden />
          <span className="text-sm">{t("risk.report.loading")}</span>
        </div>
      ) : showEmptyHero ? (
        <Card className="overflow-hidden border-2 border-brand-navy/[0.12] bg-gradient-to-b from-brand-navy/[0.06] via-white to-slate-50/80 shadow-xl ring-2 ring-brand-navy/10">
          <CardContent className="flex flex-col items-center px-6 py-14 text-center sm:px-10">
            <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-brand-navy to-brand-navy/80 text-white shadow-lg ring-[10px] ring-brand-navy/15">
              <Gauge className="h-12 w-12" strokeWidth={1.75} aria-hidden />
            </div>
            <h2 className="text-xl font-bold text-brand-navy md:text-2xl">{t("risk.report.emptyTitle")}</h2>
            <CardDescription className="mt-3 max-w-lg text-base leading-relaxed text-slate-600">
              {t("risk.report.emptyLead")}
            </CardDescription>
            <p className="mt-4 max-w-xl text-sm text-slate-500">{t("risk.report.emptyCronHint")}</p>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Button
                type="button"
                size="lg"
                disabled={recoiling}
                className="h-12 min-w-[200px] bg-brand-navy px-10 text-base font-bold shadow-lg hover:bg-brand-navy/92"
                onClick={() => void recalculate()}
              >
                <RefreshCw className={cn("mr-2 h-5 w-5", recoiling && "animate-spin")} aria-hidden />
                {recoiling ? t("risk.report.recalculateLoading") : t("risk.report.recalculate")}
              </Button>
              <Button
                type="button"
                size="lg"
                variant="outline"
                className="h-12 min-w-[160px] border-brand-navy/30 font-semibold"
                disabled={loading}
                onClick={() => void load()}
              >
                <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} aria-hidden />
                {t("risk.report.refresh")}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : hasData ? (
        <RiskScoresDataTable data={rows} t={t} localeTag={localeTag} />
      ) : null}
    </div>
  );
}
