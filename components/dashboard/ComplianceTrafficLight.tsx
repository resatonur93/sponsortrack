"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BriefcaseBusiness,
  ChevronDown,
  FileWarning,
  Fingerprint,
  Plane,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/contexts/LanguageContext";
import type {
  ComplianceAggregateRow,
  ComplianceCategoryId,
  ComplianceGroupedPersonItem,
  DashboardSummary,
  TrafficLightState,
} from "@/lib/compliance/types";
import { Badge } from "@/components/ui/badge";

const CATEGORY_ICONS: Record<ComplianceCategoryId, LucideIcon> = {
  visa: Plane,
  sponsorship: BriefcaseBusiness,
  rightToWork: Fingerprint,
  documents: FileWarning,
};

function lightRingClass(light: TrafficLightState): string {
  switch (light) {
    case "red":
      return "ring-red-500/80 bg-red-50";
    case "amber":
      return "ring-amber-500/80 bg-amber-50";
    default:
      return "ring-green-500/80 bg-emerald-50";
  }
}

function lightIconColor(light: TrafficLightState): string {
  switch (light) {
    case "red":
      return "text-red-500";
    case "amber":
      return "text-amber-500";
    default:
      return "text-green-500";
  }
}

function rowSurfaceClass(sev: "critical" | "warning"): string {
  return sev === "critical"
    ? "bg-red-50/80 border-red-100"
    : "bg-amber-50/80 border-amber-100";
}

function rowBorderClass(sev: "critical" | "warning"): string {
  return sev === "critical" ? "border-l-red-500" : "border-l-amber-500";
}

type Props = {
  className?: string;
  /**
   * Panel verisinden doldurulursa dahili istek yapılmaz.
   * `null` = üst bileşen yükleniyor (iskelet).
   * `undefined` = yalnız bu bileşen `/api/compliance/status` çağırır.
   */
  traffic?: DashboardSummary | null;
};

export function ComplianceTrafficLight({
  className,
  traffic,
}: Props): JSX.Element {
  const { t, locale } = useTranslation();
  const external = traffic !== undefined;
  const [payload, setPayload] = useState<DashboardSummary | null>(() =>
    external ? traffic ?? null : null
  );
  const [loadFailed, setLoadFailed] = useState(false);
  const [selected, setSelected] = useState<ComplianceCategoryId | null>(null);

  const load = useCallback(async (): Promise<void> => {
    setLoadFailed(false);
    const res = await fetch("/api/compliance/status", {
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) {
      setLoadFailed(true);
      setPayload(null);
      return;
    }
    const json = (await res.json()) as { data: DashboardSummary };
    setPayload(json.data);
  }, []);

  useEffect(() => {
    if (!external) return;
    setPayload(traffic ?? null);
    setLoadFailed(false);
  }, [external, traffic]);

  useEffect(() => {
    if (external) return;
    void load();
  }, [external, load]);

  const categories = useMemo(
    () => payload?.categories ?? [],
    [payload?.categories]
  );

  const activeCategory = useMemo(() => {
    if (!selected) return null;
    return categories.find((c) => c.id === selected) ?? null;
  }, [categories, selected]);

  const aggregateItems = useMemo(
    () => payload?.aggregateItems ?? [],
    [payload?.aggregateItems]
  );

  const labelFor = useCallback(
    (id: ComplianceCategoryId) => {
      switch (id) {
        case "visa":
          return t("dashboard.complianceTraffic.visa");
        case "sponsorship":
          return t("dashboard.complianceTraffic.sponsorship");
        case "rightToWork":
          return t("dashboard.complianceTraffic.rtw");
        case "documents":
          return t("dashboard.complianceTraffic.documents");
        default:
          return id;
      }
    },
    [t]
  );

  const headline = useCallback(
    (tr: string, en: string) => (locale === "tr" ? tr : en),
    [locale]
  );

  if (loadFailed) {
    return (
      <div
        className={cn(
          "rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900",
          className
        )}
      >
        {t("dashboard.complianceTraffic.loadError")}
      </div>
    );
  }

  if (!payload) {
    return (
      <div
        className={cn("space-y-4", className)}
        aria-busy="true"
        aria-live="polite"
      >
        <div className="space-y-1">
          <div className="h-6 w-40 animate-pulse rounded bg-brand-navy/15" />
          <div className="h-4 w-full max-w-md animate-pulse rounded bg-brand-navy/10" />
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-xl border border-brand-navy/10 bg-white shadow-card"
            />
          ))}
        </div>
        <div className="h-24 animate-pulse rounded-xl border border-brand-navy/10 bg-white shadow-card" />
      </div>
    );
  }

  const renderExtraCount = (n: number): JSX.Element | null => {
    if (n <= 0) return null;
    return (
      <span className="text-xs font-medium text-slate-600">
        +{n} {t("dashboard.complianceTraffic.moreNotifications")}
      </span>
    );
  };

  const renderAggregateRow = (row: ComplianceAggregateRow): JSX.Element => (
    <details
      key={row.workerId}
      className={cn(
        "group rounded-lg border border-brand-navy/10 shadow-sm",
        rowSurfaceClass(row.severity),
        "border-l-4",
        rowBorderClass(row.severity)
      )}
    >
      <summary className="relative flex cursor-pointer list-none flex-col gap-2 p-3 pr-10 marker:content-none [&::-webkit-details-marker]:hidden sm:flex-row sm:items-start sm:justify-between">
        <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 shrink-0 text-brand-navy/50 transition-transform group-open:rotate-180" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/workers/${row.workerId}`}
              className="font-semibold text-brand-navy underline-offset-2 hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {row.workerName}
            </Link>
            {row.categoryBadges.map((c) => (
              <Badge
                key={`${row.workerId}-${c}`}
                variant="outline"
                className="border-brand-navy/20 bg-white/80 text-xs text-brand-navy"
              >
                {labelFor(c)}
              </Badge>
            ))}
          </div>
          <p className="text-sm text-slate-800">
            {headline(row.headlineTr, row.headlineEn)}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {renderExtraCount(row.extraCount)}
            {row.extraCount > 0 ? (
              <span className="text-[11px] text-slate-500">
                {t("dashboard.complianceTraffic.expandDetails")}
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <Badge
            variant="outline"
            className={cn(
              "w-fit",
              row.severity === "critical"
                ? "border-red-400 text-red-900"
                : "border-amber-400 text-amber-950"
            )}
          >
            {row.severity === "critical"
              ? t("dashboard.complianceTraffic.severityCritical")
              : t("dashboard.complianceTraffic.severityWarning")}
          </Badge>
        </div>
      </summary>
      {row.extraLines.length ? (
        <ul className="space-y-1.5 border-t border-brand-navy/10 px-3 py-2 pb-3 text-sm text-slate-700">
          {row.extraLines.map((line, idx) => (
            <li key={`${row.workerId}-ex-${idx}`} className="flex flex-wrap gap-2">
              <span className="text-slate-800">
                {headline(line.tr, line.en)}
              </span>
              <Badge variant="outline" className="text-[10px] uppercase">
                {labelFor(line.category)}
              </Badge>
            </li>
          ))}
        </ul>
      ) : null}
    </details>
  );

  const renderCategoryRow = (row: ComplianceGroupedPersonItem): JSX.Element => (
    <details
      key={`${row.category}-${row.workerId}`}
      className={cn(
        "group rounded-lg border border-brand-navy/10 shadow-sm",
        rowSurfaceClass(row.worstSeverity),
        "border-l-4",
        rowBorderClass(row.worstSeverity)
      )}
    >
      <summary className="relative flex cursor-pointer list-none flex-col gap-2 p-3 pr-10 marker:content-none [&::-webkit-details-marker]:hidden sm:flex-row sm:items-start sm:justify-between">
        <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 shrink-0 text-brand-navy/50 transition-transform group-open:rotate-180" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/workers/${row.workerId}`}
              className="font-semibold text-brand-navy underline-offset-2 hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {row.workerName}
            </Link>
            <Badge
              variant="outline"
              className="border-brand-navy/20 bg-white/80 text-xs text-brand-navy"
            >
              {labelFor(row.category)}
            </Badge>
          </div>
          <p className="text-sm text-slate-800">
            {headline(row.headlineTr, row.headlineEn)}
          </p>
          {row.extraCount > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              {renderExtraCount(row.extraCount)}
              <span className="text-[11px] text-slate-500">
                {t("dashboard.complianceTraffic.expandDetails")}
              </span>
            </div>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <Badge
            variant="outline"
            className={cn(
              "w-fit",
              row.worstSeverity === "critical"
                ? "border-red-400 text-red-900"
                : "border-amber-400 text-amber-950"
            )}
          >
            {row.worstSeverity === "critical"
              ? t("dashboard.complianceTraffic.severityCritical")
              : t("dashboard.complianceTraffic.severityWarning")}
          </Badge>
        </div>
      </summary>
      {row.extraLinesTr.length ? (
        <ul className="space-y-1 border-t border-brand-navy/10 px-3 py-2 pb-3 text-sm text-slate-700">
          {(locale === "tr" ? row.extraLinesTr : row.extraLinesEn).map(
            (line, idx) => (
              <li key={`${row.workerId}-cat-${idx}`}>{line}</li>
            )
          )}
        </ul>
      ) : null}
    </details>
  );

  return (
    <section className={cn("space-y-4", className)}>
      <div>
        <h2 className="text-base font-semibold text-brand-navy">
          {t("dashboard.complianceTraffic.title")}
        </h2>
        <p className="text-sm text-slate-600">
          {t("dashboard.complianceTraffic.subtitle")}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {categories.map((cat) => {
          const Icon = CATEGORY_ICONS[cat.id];
          const isSelected = selected === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              aria-pressed={isSelected}
              aria-label={`${labelFor(cat.id)} — ${cat.criticalCount} ${t("dashboard.complianceTraffic.criticalLabel")}, ${cat.warningCount} ${t("dashboard.complianceTraffic.warningHint")}`}
              onClick={() =>
                setSelected((s) => (s === cat.id ? null : cat.id))
              }
              className={cn(
                "relative flex flex-col items-start gap-2 rounded-xl border border-brand-navy/12 p-3 text-left shadow-card transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2",
                lightRingClass(cat.trafficLight),
                isSelected && "ring-2 ring-brand-navy/40"
              )}
            >
              <div className="flex w-full items-start justify-between gap-2">
                <Icon
                  className={cn(
                    "h-6 w-6 shrink-0",
                    lightIconColor(cat.trafficLight)
                  )}
                  aria-hidden
                />
                <span
                  className={cn(
                    "inline-flex h-3 w-3 shrink-0 rounded-full",
                    cat.trafficLight === "red" && "bg-red-500",
                    cat.trafficLight === "amber" && "bg-amber-500",
                    cat.trafficLight === "green" && "bg-green-500"
                  )}
                  title={cat.trafficLight}
                />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-navy/80">
                  {labelFor(cat.id)}
                </p>
                <p className="mt-1.5 text-sm font-semibold tabular-nums leading-snug text-brand-navy">
                  <span className="text-lg font-bold">{cat.criticalCount}</span>{" "}
                  {t("dashboard.complianceTraffic.criticalLabel")}
                  <span className="text-brand-navy/40" aria-hidden>
                    {" "}
                    ·{" "}
                  </span>
                  <span className="text-lg font-bold">{cat.warningCount}</span>{" "}
                  {t("dashboard.complianceTraffic.warningHint")}
                </p>
              </div>
              <Link
                href={cat.detailHref}
                className="mt-auto text-xs font-semibold text-brand-navy underline-offset-2 hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {t("dashboard.complianceTraffic.detailLink")}
              </Link>
            </button>
          );
        })}
      </div>

      <div className="rounded-xl border border-brand-navy/15 bg-white p-4 shadow-card">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-brand-navy">
            {selected
              ? `${labelFor(selected)} — ${t("dashboard.complianceTraffic.detailHeading")}`
              : t("dashboard.complianceTraffic.allCategoriesHeading")}
          </h3>
          {selected ? (
            <button
              type="button"
              className="text-xs font-medium text-brand-navy underline"
              onClick={() => setSelected(null)}
            >
              {t("dashboard.complianceTraffic.clearFilter")}
            </button>
          ) : null}
        </div>

        {!selected ? (
          aggregateItems.length === 0 ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/90 px-4 py-6 text-center text-sm text-emerald-950">
              {t("dashboard.complianceTraffic.aggregateEmpty")}
            </div>
          ) : (
            <div className="space-y-2">
              {aggregateItems.map((row) => renderAggregateRow(row))}
            </div>
          )
        ) : activeCategory ? (
          activeCategory.items.length === 0 ? (
            <p className="text-sm text-slate-500">
              {t("dashboard.complianceTraffic.noIssues")}
            </p>
          ) : (
            <div className="space-y-2">
              {activeCategory.items.map((row) => renderCategoryRow(row))}
            </div>
          )
        ) : null}
      </div>
    </section>
  );
}
