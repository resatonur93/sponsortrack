"use client";

import { useState } from "react";
import type { NotificationEvent } from "@prisma/client";
import {
  CalendarClock,
  FileWarning,
  Inbox,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/contexts/LanguageContext";
import type { Locale } from "@/lib/i18n/types";
import { cn } from "@/lib/utils";

function formatLocaleDate(
  d: Date | string | null | undefined,
  locale: Locale
): string {
  if (!d) return "—";
  const tag = locale === "tr" ? "tr-TR" : "en-GB";
  return new Date(d).toLocaleDateString(tag);
}

function statusPresentation(
  status: NotificationEvent["status"]
): { variant: "success" | "warning" | "danger" | "outline"; className?: string } {
  switch (status) {
    case "PENDING":
      return {
        variant: "warning",
        className:
          "px-3 py-0.5 text-[11px] font-bold uppercase tracking-wide shadow-sm ring-2 ring-amber-400/50",
      };
    case "OVERDUE":
      return {
        variant: "danger",
        className:
          "px-3 py-0.5 text-[11px] font-bold uppercase tracking-wide shadow-sm",
      };
    case "COMPLETED":
      return { variant: "success", className: "px-3 py-0.5 text-[11px] font-semibold" };
    default:
      return {
        variant: "outline",
        className:
          "px-3 py-0.5 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200",
      };
  }
}

function isHighUrgencyType(eventType: string): boolean {
  return /VISA_EXPIRING|SPONSORSHIP_ENDING|RIGHT_TO_WORK_RECHECK|DOCUMENT_EXPIRING/.test(
    eventType
  );
}

export function WorkerComplianceNotifications(props: {
  notifications: NotificationEvent[];
  onRefresh: () => void;
}): JSX.Element {
  const { notifications, onRefresh } = props;
  const { t, locale } = useTranslation();
  const [completingId, setCompletingId] = useState<string | null>(null);

  function typeTitleFor(eventType: string): string {
    const key = `notifications.type.${eventType}`;
    const label = t(key);
    return label === key ? eventType.replace(/_/g, " ") : label;
  }

  async function complete(id: string): Promise<void> {
    setCompletingId(id);
    try {
      const res = await fetch(`/api/notifications/${id}/complete`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) return;
      onRefresh();
    } finally {
      setCompletingId(null);
    }
  }

  return (
    <section className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold text-brand-navy">
          {t("workerDetail.notificationsReporting")}
        </h3>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-600">
          {t("workerDetail.notificationsReportingHint")}
        </p>
      </div>

      {notifications.length === 0 ? (
        <Card className="border-dashed border-slate-200 bg-slate-50/50 shadow-none">
          <CardContent className="flex flex-col items-center px-6 py-14 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200/80">
              <Inbox className="h-6 w-6 text-slate-400" aria-hidden />
            </div>
            <p className="mt-4 text-sm font-semibold text-brand-navy">
              {t("workerDetail.notificationsEmptyTitle")}
            </p>
            <p className="mt-2 max-w-md text-sm text-slate-600">
              {t("workerDetail.notificationsEmptyHint")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-4" role="list">
          {notifications.map((n) => {
            const typeTitle = typeTitleFor(n.eventType);
            const sp = statusPresentation(n.status);
            const urgentAccent =
              n.status === "OVERDUE"
                ? "border-l-4 border-l-red-500"
                : n.status === "PENDING" && isHighUrgencyType(n.eventType)
                  ? "border-l-4 border-l-amber-500"
                  : "border-l-4 border-l-transparent";

            const canResolve =
              n.status === "PENDING" || n.status === "OVERDUE";

            return (
              <li key={n.id}>
                <Card
                  className={cn(
                    "overflow-hidden border-slate-200/95 shadow-sm transition-all duration-200",
                    "hover:-translate-y-0.5 hover:border-brand-navy/15 hover:shadow-lg",
                    urgentAccent
                  )}
                >
                  <CardHeader className="space-y-3 pb-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1 space-y-1">
                      <Badge
                        variant="outline"
                        className="mb-1.5 inline-flex max-w-full font-mono text-[10px] font-bold uppercase tracking-tight border-slate-200 bg-slate-50 text-slate-800"
                      >
                          <span className="truncate">{n.eventType.replace(/_/g, " ")}</span>
                        </Badge>
                      <CardTitle className="text-base leading-snug text-brand-navy">
                        {typeTitle}
                      </CardTitle>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                        <span className="inline-flex items-center gap-1.5 tabular-nums">
                          <CalendarClock className="h-3.5 w-3.5 text-slate-500" aria-hidden />
                          {formatLocaleDate(n.occurredAt ?? n.createdAt, locale)}
                          {" → "}
                          {t("workerDetail.deadline")}:{" "}
                          {formatLocaleDate(n.reportDeadlineAt ?? n.dueDate, locale)}
                        </span>
                      </div>
                      </div>
                      <Badge
                        variant={sp.variant}
                        className={cn("shrink-0", sp.className)}
                      >
                        {t(`workerDetail.notificationStatus.${n.status}`)}
                      </Badge>
                    </div>
                    {canResolve ? (
                      <div className="flex justify-end pt-1">
                        <Button
                          type="button"
                          size="sm"
                          className="h-9 min-w-[9rem] font-semibold shadow-sm"
                          disabled={completingId === n.id}
                          onClick={() => void complete(n.id)}
                        >
                          {completingId === n.id
                            ? t("workerDetail.notificationCompleting")
                            : t("workerDetail.notificationMarkDone")}
                        </Button>
                      </div>
                    ) : null}
                  </CardHeader>
                  <CardContent className="space-y-3 pb-6 pt-0 text-sm">
                    {n.evidenceRequired ? (
                      <div className="flex gap-2 rounded-lg border border-amber-200/70 bg-amber-50/50 px-3 py-2.5 text-xs text-amber-950">
                        <FileWarning className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
                        <p>
                          <span className="font-semibold">{t("workerDetail.evidence")}:</span>{" "}
                          {n.evidenceRequired}
                        </p>
                      </div>
                    ) : null}
                    {n.smsDraft ? (
                      <div>
                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          {t("workerDetail.notificationSmsDraft")}
                        </p>
                        <div className="rounded-lg border border-slate-200/90 bg-slate-50 px-3 py-2 font-mono text-xs leading-relaxed text-slate-800">
                          {n.smsDraft}
                        </div>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
