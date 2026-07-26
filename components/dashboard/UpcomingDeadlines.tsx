"use client";

import Link from "next/link";
import type { NotificationType } from "@prisma/client";
import { useTranslation } from "@/contexts/LanguageContext";

function tEnum(
  translate: (key: string, fallback?: string) => string,
  key: string,
  fallback: string
): string {
  const v = translate(key, fallback);
  return v === key ? fallback : v;
}

type EventRow = {
  id: string;
  eventType: NotificationType;
  status: string;
  dueDate: string;
  worker: { firstName: string; lastName: string; id: string };
};

export function UpcomingDeadlines(props: { events: EventRow[] }): JSX.Element {
  const { t, locale } = useTranslation();
  const localeTag = locale === "tr" ? "tr-TR" : "en-GB";

  const upcoming = [...props.events]
    .filter((e) => e.status !== "COMPLETED" && e.status !== "CANCELLED")
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 5);

  return (
    <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-card">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-slate-400">
        {t("dashboard.upcomingDeadlines.title")}
      </h2>
      {upcoming.length === 0 ? (
        <p className="text-sm text-slate-500">{t("dashboard.upcomingDeadlines.empty")}</p>
      ) : (
        <ul className="space-y-2">
          {upcoming.map((e) => {
            const due = new Date(e.dueDate);
            return (
              <li key={e.id}>
                <Link
                  href={`/workers/${e.worker.id}`}
                  className="flex items-center gap-3 rounded-lg p-2 text-sm transition-colors hover:bg-brand-surface/60"
                >
                  <div className="flex w-12 shrink-0 flex-col items-center rounded-md bg-brand-navy/8 py-1">
                    <span className="text-[10px] font-semibold uppercase text-brand-navy/60">
                      {due.toLocaleDateString(localeTag, { month: "short" })}
                    </span>
                    <span className="text-base font-bold tabular-nums text-brand-navy">
                      {due.getDate()}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-slate-900">
                      {tEnum(t, `notifications.type.${e.eventType}`, e.eventType)}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {e.worker.firstName} {e.worker.lastName}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
