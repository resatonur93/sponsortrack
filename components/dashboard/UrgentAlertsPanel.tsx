"use client";

import Link from "next/link";
import { AlertCircle, Clock, FileText, ChevronRight } from "lucide-react";
import type { AlertLevel, AlertType } from "@prisma/client";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/contexts/LanguageContext";

function tEnum(
  translate: (key: string, fallback?: string) => string,
  key: string,
  fallback: string
): string {
  const v = translate(key, fallback);
  return v === key ? fallback : v;
}

type AlertRow = {
  id: string;
  level: AlertLevel;
  alertType: AlertType;
  message: string;
  isRead: boolean;
  worker: { id: string; firstName: string; lastName: string } | null;
};

function iconFor(level: AlertLevel): typeof AlertCircle {
  if (level === "CRITICAL" || level === "HIGH") return AlertCircle;
  if (level === "MEDIUM") return Clock;
  return FileText;
}

function badgeClass(level: AlertLevel): string {
  switch (level) {
    case "CRITICAL":
      return "bg-red-100 text-red-700";
    case "HIGH":
      return "bg-orange-100 text-orange-700";
    case "MEDIUM":
      return "bg-amber-100 text-amber-700";
    default:
      return "bg-emerald-100 text-emerald-700";
  }
}

export function UrgentAlertsPanel(props: { alerts: AlertRow[] }): JSX.Element {
  const { t } = useTranslation();

  return (
    <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-card">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">
          {t("dashboard.urgentAlerts.title")}
        </h2>
        <Link
          href="/alerts"
          className="text-xs font-semibold text-brand-navy transition-colors hover:text-brand-gold"
        >
          {t("dashboard.urgentAlerts.viewAll")} →
        </Link>
      </div>
      {props.alerts.length === 0 ? (
        <p className="text-sm text-slate-500">{t("dashboard.noAlerts")}</p>
      ) : (
        <ul className="space-y-2">
          {props.alerts.map((a) => {
            const Icon = iconFor(a.level);
            return (
              <li key={a.id}>
                <Link
                  href={a.worker ? `/workers/${a.worker.id}` : "/alerts"}
                  className="flex items-center gap-3 rounded-lg border border-slate-100 bg-white p-3 transition-colors hover:bg-brand-surface/60"
                >
                  <span
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                      badgeClass(a.level)
                    )}
                    aria-hidden
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {tEnum(t, `alerts.type.${a.alertType}`, a.alertType)}
                      {!a.isRead ? (
                        <span className="ml-2 text-xs font-semibold text-red-600">
                          {t("dashboard.newBadge")}
                        </span>
                      ) : null}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {a.worker ? `${a.worker.firstName} ${a.worker.lastName}` : a.message}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" aria-hidden />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
