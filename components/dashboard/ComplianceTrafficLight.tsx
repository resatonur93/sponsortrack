"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BriefcaseBusiness,
  FileWarning,
  Fingerprint,
  Plane,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/contexts/LanguageContext";
import type {
  ComplianceTrafficCategory,
  ComplianceTrafficCategoryId,
  ComplianceTrafficStatusPayload,
} from "@/lib/compliance-traffic-status";
import { Badge } from "@/components/ui/badge";

const CATEGORY_ICONS: Record<ComplianceTrafficCategoryId, LucideIcon> = {
  visa: Plane,
  sponsorship: BriefcaseBusiness,
  rightToWork: Fingerprint,
  documents: FileWarning,
};

function lightRingClass(light: "green" | "amber" | "red"): string {
  switch (light) {
    case "red":
      return "ring-red-500/80 bg-red-50/70";
    case "amber":
      return "ring-amber-500/80 bg-amber-50/70";
    default:
      return "ring-green-500/80 bg-emerald-50/60";
  }
}

function lightIconColor(light: "green" | "amber" | "red"): string {
  switch (light) {
    case "red":
      return "text-red-500";
    case "amber":
      return "text-amber-500";
    default:
      return "text-green-500";
  }
}

type Props = {
  className?: string;
};

export function ComplianceTrafficLight({ className }: Props): JSX.Element {
  const { t } = useTranslation();
  const [payload, setPayload] = useState<ComplianceTrafficStatusPayload | null>(
    null
  );
  const [loadFailed, setLoadFailed] = useState(false);
  const [selected, setSelected] = useState<ComplianceTrafficCategoryId | null>(
    null
  );

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
    const json = (await res.json()) as { data: ComplianceTrafficStatusPayload };
    setPayload(json.data);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const categories = useMemo(
    () => payload?.categories ?? [],
    [payload?.categories]
  );

  const activeCategory: ComplianceTrafficCategory | null = useMemo(() => {
    if (!selected) return null;
    return categories.find((c) => c.id === selected) ?? null;
  }, [categories, selected]);

  const labelFor = useCallback(
    (id: ComplianceTrafficCategoryId) => {
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

  if (loadFailed) {
    return (
      <div
        className={cn(
          "rounded-xl border border-red-200 bg-red-50/80 p-4 text-sm text-red-900",
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
        className={cn(
          "grid grid-cols-2 gap-3 md:grid-cols-4",
          className
        )}
        aria-busy="true"
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-xl border border-brand-navy/10 bg-white shadow-card"
          />
        ))}
      </div>
    );
  }

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
              aria-label={`${labelFor(cat.id)} — ${cat.criticalCount} ${t("dashboard.complianceTraffic.criticalLabel")}`}
              onClick={() =>
                setSelected((s) => (s === cat.id ? null : cat.id))
              }
              className={cn(
                "flex flex-col items-start gap-2 rounded-xl border border-brand-navy/12 p-3 text-left shadow-card transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2",
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
                <p className="mt-1 text-2xl font-bold tabular-nums text-brand-navy">
                  {cat.criticalCount}
                </p>
                <p className="text-[11px] leading-tight text-slate-600">
                  {t("dashboard.complianceTraffic.criticalLabel")}
                  {cat.warningCount > 0 ? (
                    <span className="text-amber-700">
                      {" "}
                      · {cat.warningCount}{" "}
                      {t("dashboard.complianceTraffic.warningHint")}
                    </span>
                  ) : null}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {activeCategory ? (
        <div className="rounded-xl border border-brand-navy/15 bg-white p-4 shadow-card">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-brand-navy">
              {labelFor(activeCategory.id)} —{" "}
              {t("dashboard.complianceTraffic.detailHeading")}
            </h3>
            <button
              type="button"
              className="text-xs font-medium text-brand-navy underline"
              onClick={() => setSelected(null)}
            >
              {t("dashboard.complianceTraffic.clearFilter")}
            </button>
          </div>
          {activeCategory.items.length === 0 ? (
            <p className="text-sm text-slate-500">
              {t("dashboard.complianceTraffic.noIssues")}
            </p>
          ) : (
            <ul className="divide-y divide-brand-navy/10 rounded-lg border border-brand-navy/10">
              {activeCategory.items.map((row) => (
                <li
                  key={`${activeCategory.id}-${row.workerId}-${row.detail.slice(0, 40)}`}
                  className="flex flex-col gap-1 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/workers/${row.workerId}`}
                      className="font-medium text-brand-navy underline-offset-2 hover:underline"
                    >
                      {row.workerName}
                    </Link>
                    <p className="text-sm text-slate-600">{row.detail}</p>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      "w-fit shrink-0",
                      row.severity === "critical"
                        ? "border-red-300 text-red-800"
                        : "border-amber-300 text-amber-900"
                    )}
                  >
                    {row.severity === "critical"
                      ? t("dashboard.complianceTraffic.severityCritical")
                      : t("dashboard.complianceTraffic.severityWarning")}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </section>
  );
}
