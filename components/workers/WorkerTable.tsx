"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock,
  Eye,
  Hourglass,
  PauseCircle,
  XCircle,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { workerProfileHref } from "@/lib/workers/profile-link";
import type { WorkerListItem } from "@/lib/workers/types";

function initials(first: string, last: string): string {
  const a = first.trim().charAt(0);
  const b = last.trim().charAt(0);
  return `${a}${b}`.toUpperCase() || "?";
}

function visaDotClass(u: WorkerListItem["visaUrgency"]): string {
  switch (u) {
    case "expired":
      return "bg-red-500 ring-red-600/40";
    case "expiring":
      return "bg-amber-500 ring-amber-600/35";
    case "ok":
      return "bg-emerald-500 ring-emerald-600/35";
    default:
      return "bg-slate-300 ring-slate-400/25";
  }
}

function visaBadgeClass(u: WorkerListItem["visaUrgency"]): string {
  switch (u) {
    case "expired":
      return "border-red-300 bg-red-50 text-red-900 shadow-sm ring-1 ring-red-500/10";
    case "expiring":
      return "border-amber-300 bg-amber-50 text-amber-950 shadow-sm ring-1 ring-amber-500/15";
    case "ok":
      return "border-emerald-200 bg-emerald-50/90 text-emerald-950 shadow-sm ring-1 ring-emerald-500/10";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700 shadow-sm ring-1 ring-slate-500/10";
  }
}

function derivedStatusVisual(
  s: WorkerListItem["derivedStatus"]
): { className: string; icon: JSX.Element } {
  switch (s) {
    case "PENDING_ONBOARDING":
      return {
        className:
          "border-amber-400/70 bg-amber-50 font-medium text-amber-950 shadow-sm ring-1 ring-amber-500/20",
        icon: <Hourglass className="h-3.5 w-3.5 shrink-0" aria-hidden />,
      };
    case "ACTIVE":
      return {
        className:
          "border-emerald-400/70 bg-emerald-50 font-medium text-emerald-950 shadow-sm ring-1 ring-emerald-500/20",
        icon: <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden />,
      };
    case "VISA_EXPIRING":
      return {
        className:
          "border-amber-400/70 bg-amber-50 font-medium text-amber-950 shadow-sm ring-1 ring-amber-500/20",
        icon: <CalendarClock className="h-3.5 w-3.5 shrink-0" aria-hidden />,
      };
    case "EXPIRED":
      return {
        className:
          "border-red-400/70 bg-red-50 font-medium text-red-950 shadow-sm ring-1 ring-red-500/20",
        icon: <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />,
      };
    case "INACTIVE_SUSPENDED":
      return {
        className:
          "border-slate-300 bg-slate-100 font-medium text-slate-900 shadow-sm ring-1 ring-black/10",
        icon: <PauseCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />,
      };
    case "INACTIVE_TERMINATED":
      return {
        className:
          "border-slate-300 bg-slate-100 font-medium text-slate-900 shadow-sm ring-1 ring-black/10",
        icon: <XCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />,
      };
    default:
      return {
        className:
          "border-slate-200 bg-white font-medium text-slate-800 shadow-sm ring-1 ring-black/5",
        icon: <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />,
      };
  }
}

function ProfileCtaButton({
  workerId,
  label,
  tooltip,
  layout = "table",
}: {
  workerId: string;
  label: string;
  tooltip: string;
  layout?: "table" | "card";
}): JSX.Element {
  const href = workerProfileHref(workerId);

  const button = (
    <Button
      variant="default"
      size={layout === "card" ? "default" : "sm"}
      className={cn(
        "gap-2 font-semibold shadow-md transition-[transform,box-shadow] hover:-translate-y-px hover:shadow-lg",
        layout === "card" && "w-full justify-center"
      )}
      asChild
    >
      <Link href={href} aria-label={tooltip} title={tooltip} className={cn(layout === "card" && "rounded-md")}>
        <Eye className="h-4 w-4 shrink-0 opacity-95" aria-hidden />
        <span>{label}</span>
        <ArrowRight className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
      </Link>
    </Button>
  );

  return (
    <div
      className={cn(
        "group/tooltip relative inline-flex",
        layout === "table" && "justify-end"
      )}
    >
      {button}
      <div
        role="tooltip"
        className="pointer-events-none invisible absolute bottom-full right-0 z-50 mb-2 w-[min(18rem,calc(100vw-2rem))] opacity-0 transition-opacity duration-150 group-hover/tooltip:visible group-hover/tooltip:opacity-100 group-focus-within/tooltip:visible group-focus-within/tooltip:opacity-100"
      >
        <div className="rounded-lg border border-slate-700/40 bg-slate-900 px-3 py-2.5 text-left text-xs font-medium leading-snug text-white shadow-xl">
          {tooltip}
        </div>
        <div className="absolute -bottom-1 right-6 h-2 w-2 rotate-45 border-b border-r border-slate-700/40 bg-slate-900" />
      </div>
    </div>
  );
}

export function WorkerTable(props: { workers: WorkerListItem[] }): JSX.Element {
  const { t, locale } = useTranslation();
  const localeTag = locale === "tr" ? "tr-TR" : "en-GB";
  const ctaLabel = t("workers.profileCta.short");
  const ctaTooltip = t("workers.profileCta.tooltip");

  function derivedLabel(s: WorkerListItem["derivedStatus"]): string {
    return t(`workers.listBadge.${s}`);
  }

  function visaBadgeLabel(u: WorkerListItem["visaUrgency"]): string {
    return t(`workers.visaBadge.${u}`);
  }

  return (
    <>
      <div className="space-y-3 md:hidden">
        {props.workers.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">
            {t("common.noRecords")}
          </p>
        ) : (
          props.workers.map((w) => {
            const vis = derivedStatusVisual(w.derivedStatus);
            return (
              <div
                key={w.id}
                className="rounded-xl border border-brand-navy/12 bg-white p-4 shadow-card transition-shadow hover:border-brand-navy/20 hover:shadow-md"
              >
                <div className="flex items-start gap-3">
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-navy/12 text-sm font-semibold text-brand-navy ring-2 ring-brand-navy/10"
                    aria-hidden
                  >
                    {initials(w.firstName, w.lastName)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-brand-navy">
                      {w.firstName} {w.lastName}
                    </p>
                    <p className="truncate text-xs text-slate-600">{w.email}</p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      {t("workers.cosShort")}:{" "}
                      <span className="font-mono text-slate-700">
                        {w.cosReference}
                      </span>
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge
                    variant="outline"
                    className={cn("gap-1 px-2.5 py-0.5", vis.className)}
                  >
                    {vis.icon}
                    {derivedLabel(w.derivedStatus)}
                  </Badge>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "inline-block h-2.5 w-2.5 shrink-0 rounded-full ring-2",
                        visaDotClass(w.visaUrgency)
                      )}
                      aria-hidden
                    />
                    <Badge
                      variant="outline"
                      className={cn("px-2 py-0.5", visaBadgeClass(w.visaUrgency))}
                    >
                      {w.visaExpiryDate
                        ? `${new Date(w.visaExpiryDate).toLocaleDateString(localeTag)} · ${visaBadgeLabel(w.visaUrgency)}`
                        : visaBadgeLabel("none")}
                    </Badge>
                  </div>
                </div>
                <div className="mt-4">
                  <ProfileCtaButton
                    workerId={w.id}
                    label={ctaLabel}
                    tooltip={ctaTooltip}
                    layout="card"
                  />
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="hidden md:block overflow-x-auto">
        <Table className="min-w-[720px]">
          <TableHeader>
            <TableRow className="border-brand-navy/15 hover:bg-transparent">
              <TableHead>{t("common.name")}</TableHead>
              <TableHead>{t("common.email")}</TableHead>
              <TableHead>{t("workers.visaExpiry")}</TableHead>
              <TableHead>{t("common.status")}</TableHead>
              <TableHead className="text-right">{t("common.action")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {props.workers.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-10 text-center text-sm text-slate-500"
                >
                  {t("common.noRecords")}
                </TableCell>
              </TableRow>
            ) : (
              props.workers.map((w) => {
                const vis = derivedStatusVisual(w.derivedStatus);
                return (
                  <TableRow
                    key={w.id}
                    className="group border-brand-navy/10 transition-colors hover:bg-brand-gold/[0.08]"
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-navy/12 text-xs font-semibold text-brand-navy ring-2 ring-brand-navy/10"
                          aria-hidden
                        >
                          {initials(w.firstName, w.lastName)}
                        </div>
                        <span className="font-semibold text-brand-navy">
                          {w.firstName} {w.lastName}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[220px]">
                      <div className="truncate text-sm" title={w.email}>
                        {w.email}
                      </div>
                      <div
                        className="mt-0.5 truncate font-mono text-[11px] text-slate-500"
                        title={w.cosReference}
                      >
                        {t("workers.cosShort")}: {w.cosReference}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-start gap-2.5">
                        <span
                          className={cn(
                            "mt-1.5 inline-block h-2.5 w-2.5 shrink-0 rounded-full ring-2",
                            visaDotClass(w.visaUrgency)
                          )}
                          title={visaBadgeLabel(w.visaUrgency)}
                          aria-hidden
                        />
                        <div className="flex min-w-0 flex-col gap-1">
                          <span className="text-sm font-medium text-slate-800">
                            {w.visaExpiryDate
                              ? new Date(w.visaExpiryDate).toLocaleDateString(
                                  localeTag
                                )
                              : "—"}
                          </span>
                          <Badge
                            variant="outline"
                            className={cn(
                              "w-fit px-2 py-0 text-[11px] font-semibold",
                              visaBadgeClass(w.visaUrgency)
                            )}
                          >
                            {visaBadgeLabel(w.visaUrgency)}
                          </Badge>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-1",
                          vis.className
                        )}
                      >
                        {vis.icon}
                        {derivedLabel(w.derivedStatus)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <ProfileCtaButton
                        workerId={w.id}
                        label={ctaLabel}
                        tooltip={ctaTooltip}
                        layout="table"
                      />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
