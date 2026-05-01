"use client";

import { CheckCircle2, Circle } from "lucide-react";
import type { WorkerDetailPayload } from "@/lib/workers/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { buildWorkerComplianceChecklistItems } from "@/lib/compliance/worker-checklist-items";

export function WorkerComplianceChecklist(props: {
  data: WorkerDetailPayload;
}): JSX.Element {
  const { t } = useTranslation();
  const items = buildWorkerComplianceChecklistItems(props.data);
  const done = items.filter((i) => i.ok).length;
  const total = items.length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  return (
    <Card className="border-slate-200/90 shadow-sm ring-1 ring-slate-200/50">
      <CardHeader className="space-y-1 border-b border-slate-100 bg-slate-50/70 pb-4">
        <CardTitle className="text-lg text-brand-navy">
          {t("workerDetail.checklist")}
        </CardTitle>
        <CardDescription>{t("workerDetail.complianceChecklistIntro")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 pt-6">
        <div>
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-sm font-semibold text-slate-800">
              {t("workerDetail.complianceProgressLabel")}
            </span>
            <span className="text-sm tabular-nums text-slate-600">
              <span className="font-semibold text-brand-navy">{done}</span>
              {" / "}
              {total} · {pct}%
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200/80">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                pct === 0 && "bg-slate-300",
                pct > 0 && pct < 100 && "bg-gradient-to-r from-amber-500 to-amber-400",
                pct === 100 && "bg-gradient-to-r from-emerald-500 to-emerald-600"
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <ul className="space-y-3" role="list">
          {items.map((item) => (
            <li
              key={item.id}
              className={cn(
                "flex gap-3 rounded-xl border px-4 py-3.5 transition-colors",
                item.ok
                  ? "border-emerald-200/80 bg-emerald-50/40"
                  : "border-amber-200/70 bg-amber-50/25"
              )}
            >
              <span className="mt-0.5 shrink-0" aria-hidden>
                {item.ok ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                ) : (
                  <Circle className="h-5 w-5 text-amber-500" />
                )}
              </span>
              <div className="min-w-0 space-y-0.5">
                <p
                  className={cn(
                    "text-sm font-semibold leading-snug",
                    item.ok ? "text-emerald-950" : "text-amber-950"
                  )}
                >
                  {t(item.titleKey)}
                </p>
                <p className="text-xs leading-relaxed text-slate-600">
                  {t(item.subtitleKey)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
