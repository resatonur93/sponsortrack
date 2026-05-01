"use client";

import { ArrowRight, History } from "lucide-react";
import type { ChangeCategory } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/contexts/LanguageContext";
import type { Locale } from "@/lib/i18n/types";
import { cn } from "@/lib/utils";
import type { WorkerActivityTimelineEntry } from "@/lib/workers/history-timeline";

function formatLocaleDate(
  d: Date | string | null | undefined,
  locale: Locale
): string {
  if (!d) return "—";
  const tag = locale === "tr" ? "tr-TR" : "en-GB";
  return new Date(d).toLocaleDateString(tag);
}

function formatLocaleDateTime(d: Date | string, locale: Locale): string {
  const tag = locale === "tr" ? "tr-TR" : "en-GB";
  return new Date(d).toLocaleString(tag);
}

function changeCategoryToneClass(category: ChangeCategory): string {
  switch (category) {
    case "SALARY":
    case "CONTRACT":
      return "border-amber-200 bg-amber-50 text-amber-900";
    case "VISA":
    case "ADDRESS":
      return "border-blue-200 bg-blue-50 text-brand-navy";
    case "ABSENCE":
    case "PROMOTION":
    case "ROLE_TITLE":
      return "border-violet-200 bg-violet-50 text-violet-900";
    default:
      return "border-slate-200 bg-slate-50 text-slate-800";
  }
}

export function ActivityTimeline(props: {
  entries: WorkerActivityTimelineEntry[];
  className?: string;
}): JSX.Element {
  const { entries, className } = props;
  const { t, locale } = useTranslation();

  const kindLabels: Record<WorkerActivityTimelineEntry["kind"], string> = {
    change: t("workerDetail.timelineKindChange"),
    absence: t("workerDetail.timelineKindAbsence"),
    document: t("workerDetail.timelineKindDoc"),
    rtw: t("workerDetail.timelineKindRtw"),
  };

  const kindBadgeClass: Record<WorkerActivityTimelineEntry["kind"], string> = {
    change: "border-transparent bg-brand-navy/90 text-white",
    absence: "border-transparent bg-slate-600 text-white",
    document: "border-transparent bg-sky-600 text-white",
    rtw: "border-transparent bg-teal-600 text-white",
  };

  if (entries.length === 0) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-6 py-14 text-center",
          className
        )}
        role="status"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200/80">
          <History className="h-6 w-6 text-slate-400" aria-hidden />
        </div>
        <p className="mt-4 text-sm font-semibold text-brand-navy">
          {t("workerDetail.timelineEmptyTitle")}
        </p>
        <p className="mt-2 max-w-sm text-sm text-slate-600">
          {t("workerDetail.timelineEmptyHint")}
        </p>
      </div>
    );
  }

  return (
    <ol className={cn("relative mx-auto max-w-3xl space-y-0", className)}>
      <div
        aria-hidden
        className="absolute left-[0.6875rem] top-4 bottom-4 w-px bg-gradient-to-b from-slate-200 via-slate-200 to-transparent sm:left-[11px]"
      />
      {entries.map((entry, idx) => {
        const kind = entry.kind;
        const headline =
          kind === "change"
            ? entry.change?.summary ?? ""
            : kind === "absence"
              ? entry.absence?.notes?.trim()
                ? entry.absence.notes
                : t("workerDetail.absenceFmt").replace(
                    "{type}",
                    entry.absence!.typeLabel
                  )
              : kind === "document"
                ? entry.document!.fileName
                : entry.rtw!.checkMethod.replace(/_/g, " ");

        const fieldLabel =
          kind === "change"
            ? t(`workerDetail.changeCategory.${entry.change!.category}`)
            : kind === "document"
              ? entry.document!.documentType
              : kind === "rtw"
                ? entry.rtw!.checkMethod.replace(/_/g, " ")
                : kind === "absence"
                  ? t("workerDetail.timelineFieldAbsence")
                  : null;

        const absenceRange =
          kind === "absence" && entry.absence
            ? (() => {
                const a = entry.absence;
                const start = formatLocaleDate(a.startDate, locale);
                const end = a.endDate ? formatLocaleDate(a.endDate, locale) : "…";
                return `${start} – ${end}`;
              })()
            : null;

        const changeCompareBlock =
          kind === "change" && entry.change ? (
            (() => {
              const prev = entry.change.previousValue?.trim() ?? "";
              const next = entry.change.newValue?.trim() ?? "";
              if (!prev && !next) return null;
              return (
                <div className="mt-4 grid gap-3 sm:grid-cols-[1fr,auto,1fr] sm:items-stretch">
                  <div className="rounded-lg border border-rose-200/80 bg-rose-50/90 px-3 py-2.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-rose-700/90">
                      {t("workerDetail.labelPreviousValue")}
                    </p>
                    <p className="mt-1 break-words text-sm leading-relaxed text-rose-950/95">
                      {prev || "—"}
                    </p>
                  </div>
                  <div className="hidden items-center justify-center sm:flex">
                    <ArrowRight
                      className="h-5 w-5 text-slate-400"
                      aria-hidden
                    />
                  </div>
                  <div className="rounded-lg border border-emerald-200/80 bg-emerald-50/90 px-3 py-2.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-800/90">
                      {t("workerDetail.labelNewValue")}
                    </p>
                    <p className="mt-1 break-words text-sm leading-relaxed text-emerald-950/95">
                      {next || "—"}
                    </p>
                  </div>
                  <div className="col-span-full flex justify-center sm:hidden">
                    <ArrowRight
                      className="h-5 w-5 rotate-90 text-slate-400"
                      aria-hidden
                    />
                  </div>
                </div>
              );
            })()
          ) : null;

        const documentCompareBlock =
          kind === "document" && entry.document ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr,auto,1fr] sm:items-stretch">
              <div className="rounded-lg border border-rose-200/80 bg-rose-50/90 px-3 py-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-rose-700/90">
                  {t("workerDetail.labelPreviousValue")}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-rose-950/95">
                  {t("workerDetail.timelineNoPrior")}
                </p>
              </div>
              <div className="hidden items-center justify-center sm:flex">
                <ArrowRight className="h-5 w-5 text-slate-400" aria-hidden />
              </div>
              <div className="rounded-lg border border-emerald-200/80 bg-emerald-50/90 px-3 py-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-800/90">
                  {t("workerDetail.timelineDocUploaded")}
                </p>
                <p className="mt-1 break-words text-sm leading-relaxed text-emerald-950/95">
                  {entry.document.fileName}
                </p>
              </div>
              <div className="col-span-full flex justify-center sm:hidden">
                <ArrowRight
                  className="h-5 w-5 rotate-90 text-slate-400"
                  aria-hidden
                />
              </div>
            </div>
          ) : null;

        const absenceBlock =
          kind === "absence" && entry.absence && absenceRange ? (
            <div className="mt-4 rounded-lg border border-emerald-200/80 bg-emerald-50/90 px-3 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-800/90">
                {t("workerDetail.timelineAbsencePeriod")}
              </p>
              <p className="mt-1 text-sm font-medium tabular-nums text-emerald-950/95">
                {absenceRange}
              </p>
            </div>
          ) : null;

        const rtwBlock =
          kind === "rtw" && entry.rtw?.detail ? (
            <div className="mt-4 rounded-lg border border-emerald-200/80 bg-emerald-50/90 px-3 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-800/90">
                {t("workerDetail.timelineRtwOutcome")}
              </p>
              <p className="mt-1 break-words text-sm leading-relaxed text-emerald-950/95">
                {entry.rtw.detail}
              </p>
            </div>
          ) : null;

        return (
          <li key={entry.id} className="relative flex gap-4 pb-10 last:pb-0">
            <div className="relative z-[1] flex shrink-0 flex-col items-center pt-1">
              <span
                className={cn(
                  "h-3.5 w-3.5 rounded-full border-2 border-white bg-brand-navy shadow-md ring-2 ring-brand-navy/15",
                  idx === 0 && "ring-4 ring-brand-navy/10"
                )}
              />
            </div>
            <article
              className={cn(
                "min-w-0 flex-1 rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm sm:p-5",
                kind === "absence" &&
                  entry.absence?.isUnauthorised &&
                  "border-amber-200/80 bg-amber-50/30"
              )}
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    className={cn("text-[10px] font-semibold uppercase tracking-wide", kindBadgeClass[kind])}
                  >
                    {kindLabels[kind]}
                  </Badge>
                  {fieldLabel ? (
                    <Badge
                      variant="outline"
                      className={cn(
                        "font-mono text-[10px] font-semibold uppercase tracking-tight text-slate-700",
                        kind === "change" &&
                          changeCategoryToneClass(entry.change!.category)
                      )}
                    >
                      {fieldLabel}
                    </Badge>
                  ) : null}
                </div>
                <time
                  dateTime={entry.at.toISOString()}
                  className="shrink-0 text-xs tabular-nums text-slate-500 sm:text-right"
                >
                  {formatLocaleDateTime(entry.at, locale)}
                </time>
              </div>

              <p className="mt-3 text-sm font-medium leading-snug text-slate-900">
                {headline}
              </p>

              {changeCompareBlock}
              {documentCompareBlock}
              {absenceBlock}
              {rtwBlock}
            </article>
          </li>
        );
      })}
    </ol>
  );
}
