"use client";

import Link from "next/link";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Clock,
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
import { useTranslation } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import type { WorkerListItem } from "@/lib/workers/types";

function initials(first: string, last: string): string {
  const a = first.trim().charAt(0);
  const b = last.trim().charAt(0);
  return `${a}${b}`.toUpperCase() || "?";
}

function visaBadgeClass(u: WorkerListItem["visaUrgency"]): string {
  switch (u) {
    case "expired":
      return "border-red-300 bg-red-50 text-red-900";
    case "expiring":
      return "border-amber-300 bg-amber-50 text-amber-950";
    case "ok":
      return "border-slate-200 bg-slate-50 text-slate-800";
    default:
      return "border-slate-200 bg-white text-slate-600";
  }
}

function derivedStatusVisual(
  s: WorkerListItem["derivedStatus"]
): { className: string; icon: JSX.Element } {
  switch (s) {
    case "PENDING_ONBOARDING":
      return {
        className: "border-amber-300 bg-amber-50 text-amber-950",
        icon: <Hourglass className="h-3.5 w-3.5 shrink-0" aria-hidden />,
      };
    case "ACTIVE":
      return {
        className: "border-emerald-300 bg-emerald-50 text-emerald-950",
        icon: <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden />,
      };
    case "VISA_EXPIRING":
      return {
        className: "border-amber-300 bg-amber-50 text-amber-950",
        icon: <CalendarClock className="h-3.5 w-3.5 shrink-0" aria-hidden />,
      };
    case "EXPIRED":
      return {
        className: "border-red-300 bg-red-50 text-red-950",
        icon: <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />,
      };
    case "INACTIVE_SUSPENDED":
      return {
        className: "border-slate-300 bg-slate-100 text-slate-900",
        icon: <PauseCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />,
      };
    case "INACTIVE_TERMINATED":
      return {
        className: "border-slate-300 bg-slate-100 text-slate-800",
        icon: <XCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />,
      };
    default:
      return {
        className: "border-slate-200 bg-white text-slate-800",
        icon: <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />,
      };
  }
}

export function WorkerTable(props: { workers: WorkerListItem[] }): JSX.Element {
  const { t, locale } = useTranslation();
  const localeTag = locale === "tr" ? "tr-TR" : "en-GB";

  function derivedLabel(s: WorkerListItem["derivedStatus"]): string {
    return t(`workers.listBadge.${s}`);
  }

  function visaBadgeLabel(u: WorkerListItem["visaUrgency"]): string {
    return t(`workers.visaBadge.${u}`);
  }

  return (
    <>
      <div className="md:hidden space-y-3">
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
                className="rounded-xl border border-brand-navy/12 bg-white p-4 shadow-card"
              >
                <div className="flex items-start gap-3">
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-navy/10 text-sm font-semibold text-brand-navy"
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
                    className={cn("gap-1 px-2 py-0.5", vis.className)}
                  >
                    {vis.icon}
                    {derivedLabel(w.derivedStatus)}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={cn("px-2 py-0.5", visaBadgeClass(w.visaUrgency))}
                  >
                    {w.visaExpiryDate
                      ? `${new Date(w.visaExpiryDate).toLocaleDateString(localeTag)} · ${visaBadgeLabel(w.visaUrgency)}`
                      : visaBadgeLabel("none")}
                  </Badge>
                </div>
                <div className="mt-3 text-right">
                  <Link
                    href={`/workers/${w.id}`}
                    className="text-sm font-medium text-brand-navy underline"
                  >
                    {t("workerTable.detail")}
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="hidden md:block overflow-x-auto">
        <Table className="min-w-[720px]">
          <TableHeader>
            <TableRow>
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
                  <TableRow key={w.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-navy/10 text-xs font-semibold text-brand-navy"
                          aria-hidden
                        >
                          {initials(w.firstName, w.lastName)}
                        </div>
                        <span className="font-medium text-brand-navy">
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
                      <div className="flex flex-col gap-1">
                        <span className="text-sm text-slate-800">
                          {w.visaExpiryDate
                            ? new Date(w.visaExpiryDate).toLocaleDateString(
                                localeTag
                              )
                            : "—"}
                        </span>
                        <Badge
                          variant="outline"
                          className={cn(
                            "w-fit px-2 py-0 text-[11px]",
                            visaBadgeClass(w.visaUrgency)
                          )}
                        >
                          {visaBadgeLabel(w.visaUrgency)}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          "inline-flex items-center gap-1.5 px-2 py-0.5",
                          vis.className
                        )}
                      >
                        {vis.icon}
                        {derivedLabel(w.derivedStatus)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/workers/${w.id}`}
                        className="text-sm font-medium text-brand-navy hover:underline"
                      >
                        {t("workerTable.detail")}
                      </Link>
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
