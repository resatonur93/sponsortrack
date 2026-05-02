"use client";

import type { ReactNode } from "react";
import { Layers, PieChart, UserPlus, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AdminConversionRing } from "@/components/admin/AdminConversionRing";
import { cn } from "@/lib/utils";

function KpiCard(props: {
  icon: LucideIcon;
  label: string;
  hint?: string;
  children: ReactNode;
  tone?: "default" | "accent";
}): JSX.Element {
  const Icon = props.icon;
  const tone =
    props.tone === "accent"
      ? "from-sky-50/90 via-white to-white border-brand-navy/20 ring-sky-200/40"
      : "from-brand-navy/[0.06] via-white to-white border-brand-navy/12 ring-brand-navy/10";
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border bg-gradient-to-br p-5 shadow-md ring-1 transition hover:shadow-lg",
        tone
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-brand-slate">{props.label}</p>
          <div className="text-brand-navy">{props.children}</div>
          {props.hint ? <p className="text-xs leading-snug text-brand-slate">{props.hint}</p> : null}
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-navy/10 text-brand-navy shadow-inner ring-1 ring-brand-navy/10">
          <Icon className="h-5 w-5" strokeWidth={2} aria-hidden />
        </div>
      </div>
    </div>
  );
}

export function AdminDashboardKpis(props: {
  totalLeads: number;
  newToday: number;
  conversionPercent: number;
  distinctSources: number;
  conversionHint: string;
  sourcesHint: string;
  convertedLabel: string;
  t: (key: string) => string;
}): JSX.Element {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard icon={Users} label={props.t("admin.dashboard.kpi.totalLeads")} tone="accent">
        <p className="text-3xl font-bold tabular-nums tracking-tight">{props.totalLeads}</p>
      </KpiCard>
      <KpiCard icon={UserPlus} label={props.t("admin.dashboard.kpi.newToday")}>
        <p className="text-3xl font-bold tabular-nums tracking-tight text-sky-800">{props.newToday}</p>
      </KpiCard>
      <KpiCard icon={PieChart} label={props.t("admin.dashboard.kpi.conversion")} hint={props.conversionHint}>
        <div className="flex items-center gap-4">
          <AdminConversionRing percent={props.conversionPercent} size={92} stroke="#0b4a9e" />
          <div>
            <p className="text-xs font-semibold text-brand-slate">{props.t("admin.dashboard.kpi.perTotal")}</p>
            <p className="text-lg font-bold leading-tight text-brand-navy">{props.convertedLabel}</p>
          </div>
        </div>
      </KpiCard>
      <KpiCard icon={Layers} label={props.t("admin.dashboard.kpi.sources")} hint={props.sourcesHint}>
        <p className="text-3xl font-bold tabular-nums tracking-tight">{props.distinctSources}</p>
      </KpiCard>
    </div>
  );
}
