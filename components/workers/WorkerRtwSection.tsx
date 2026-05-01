"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import type { z } from "zod";
import type { RightToWorkCheck, RtwCheckMethod } from "@prisma/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormDatePicker } from "@/components/workers/worker-form/FormDatePicker";
import { useTranslation } from "@/contexts/LanguageContext";
import { rtwCheckCreateSchema } from "@/lib/schemas";
import { cn } from "@/lib/utils";

type RtwFormValues = z.infer<typeof rtwCheckCreateSchema>;

const RTW_METHODS: RtwCheckMethod[] = [
  "ONLINE_SHARE_CODE",
  "MANUAL_DOCUMENT_CHECK",
  "EMPLOYER_PORTAL",
  "RE_VERIFICATION",
  "OTHER",
];

const RTW_METHOD_LABEL_KEY: Record<RtwCheckMethod, string> = {
  ONLINE_SHARE_CODE: "workerDetail.rtwOptOnline",
  MANUAL_DOCUMENT_CHECK: "workerDetail.rtwOptManual",
  EMPLOYER_PORTAL: "workerDetail.rtwOptPortal",
  RE_VERIFICATION: "workerDetail.rtwOptReverify",
  OTHER: "workerDetail.rtwOptOther",
};

function formatLocaleDate(
  d: Date | string | null | undefined,
  locale: "tr" | "en"
): string {
  if (!d) return "—";
  const tag = locale === "tr" ? "tr-TR" : "en-GB";
  return new Date(d).toLocaleDateString(tag);
}

function formatLocaleDateTime(
  d: Date | string,
  locale: "tr" | "en"
): string {
  const tag = locale === "tr" ? "tr-TR" : "en-GB";
  return new Date(d).toLocaleString(tag);
}

export function WorkerRtwSection(props: {
  workerId: string;
  rtwChecks: RightToWorkCheck[];
  onDone: () => void;
}): JSX.Element {
  const { workerId, rtwChecks, onDone } = props;
  const { t, locale } = useTranslation();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<RtwFormValues>({
    resolver: zodResolver(rtwCheckCreateSchema),
    defaultValues: {
      checkedAt: "",
      checkMethod: "ONLINE_SHARE_CODE",
      outcomeSummary: "",
      shareCodeUsed: "",
      notes: "",
      evidenceDocumentId: null,
      nextCheckDueAt: "",
    },
  });

  const method = form.watch("checkMethod");

  async function onSubmit(values: RtwFormValues): Promise<void> {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/workers/${workerId}/rtw-checks`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checkedAt: values.checkedAt || null,
          checkMethod: values.checkMethod,
          outcomeSummary: values.outcomeSummary?.trim() || null,
          shareCodeUsed: values.shareCodeUsed?.trim() || null,
          notes: values.notes?.trim() || null,
          evidenceDocumentId: values.evidenceDocumentId || null,
          nextCheckDueAt: values.nextCheckDueAt || null,
        }),
      });
      if (!res.ok) {
        return;
      }
      form.reset({
        checkedAt: "",
        checkMethod: "ONLINE_SHARE_CODE",
        outcomeSummary: "",
        shareCodeUsed: "",
        notes: "",
        evidenceDocumentId: null,
        nextCheckDueAt: "",
      });
      onDone();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="border-slate-200/90 shadow-sm ring-1 ring-slate-200/50">
      <CardHeader className="space-y-1 border-b border-slate-100 bg-slate-50/70 pb-4">
        <CardTitle className="text-lg text-brand-navy">
          {t("workerDetail.rtwTitle")}
        </CardTitle>
        <CardDescription>{t("workerDetail.rtwCardIntro")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        <div>
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t("workerDetail.rtwHistoryHeading")}
          </h4>
          {rtwChecks.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-10 text-center"
              role="status"
            >
              <p className="text-sm font-medium text-brand-navy">
                {t("workerDetail.rtwEmptyTitle")}
              </p>
              <p className="mt-2 max-w-sm text-sm text-slate-600">
                {t("workerDetail.rtwEmptyHint")}
              </p>
            </div>
          ) : (
            <ul className="space-y-3" role="list">
              {rtwChecks.map((r) => (
                <li
                  key={r.id}
                  className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm ring-1 ring-slate-100/80"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-sm font-semibold text-brand-navy">
                      {t(RTW_METHOD_LABEL_KEY[r.checkMethod])}
                    </span>
                    <time
                      className="text-xs tabular-nums text-slate-500"
                      dateTime={new Date(r.checkedAt).toISOString()}
                    >
                      {formatLocaleDateTime(r.checkedAt, locale)}
                    </time>
                  </div>
                  {r.shareCodeUsed ? (
                    <p className="mt-2 text-xs text-slate-600">
                      <span className="font-medium text-slate-700">
                        {t("workerDetail.rtwShareCode")}:
                      </span>{" "}
                      {r.shareCodeUsed}
                    </p>
                  ) : null}
                  {r.outcomeSummary ? (
                    <p className="mt-2 text-sm leading-relaxed text-slate-800">
                      {r.outcomeSummary}
                    </p>
                  ) : null}
                  {r.nextCheckDueAt ? (
                    <p className="mt-2 text-xs text-slate-500">
                      {t("workerDetail.rtwNext")}:{" "}
                      {formatLocaleDate(r.nextCheckDueAt, locale)}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-slate-100 pt-6">
          <h4 className="mb-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t("workerDetail.rtwFormHeading")}
          </h4>
          <form
            onSubmit={form.handleSubmit((v) => void onSubmit(v))}
            className="space-y-5"
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor={`rtw-method-${workerId}`}>
                  {t("workerDetail.rtwMethod")}
                </Label>
                <Controller
                  name="checkMethod"
                  control={form.control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger
                        id={`rtw-method-${workerId}`}
                        className="h-11 border-slate-200 bg-white"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RTW_METHODS.map((m) => (
                          <SelectItem key={m} value={m}>
                            {t(RTW_METHOD_LABEL_KEY[m])}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <p className="text-xs leading-relaxed text-slate-600">
                  {t(`workerDetail.rtwMethodHint.${method}`)}
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor={`rtw-checked-${workerId}`}>
                  {t("workerDetail.rtwCheckedAt")}
                </Label>
                <Controller
                  name="checkedAt"
                  control={form.control}
                  render={({ field }) => (
                    <FormDatePicker
                      id={`rtw-checked-${workerId}`}
                      value={field.value ?? ""}
                      onChange={(v) => field.onChange(v)}
                      placeholder={t("workerDetail.rtwCheckedAtPlaceholder")}
                      locale={locale}
                    />
                  )}
                />
                <p className="text-xs text-slate-500">
                  {t("workerDetail.rtwCheckedAtHelp")}
                </p>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor={`rtw-share-${workerId}`}>
                {t("workerDetail.rtwPlaceholderShare")}
              </Label>
              <Input
                id={`rtw-share-${workerId}`}
                className="h-11 border-slate-200"
                {...form.register("shareCodeUsed")}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor={`rtw-out-${workerId}`}>
                {t("workerDetail.rtwOutcomeLabel")}
              </Label>
              <Input
                id={`rtw-out-${workerId}`}
                className="h-11 border-slate-200"
                {...form.register("outcomeSummary")}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor={`rtw-notes-${workerId}`}>
                {t("workerDetail.rtwNotesLabel")}
              </Label>
              <Input
                id={`rtw-notes-${workerId}`}
                className="h-11 border-slate-200"
                {...form.register("notes")}
              />
            </div>

            <div className="grid gap-2 sm:max-w-xs">
              <Label htmlFor={`rtw-next-${workerId}`}>
                {t("workerDetail.rtwNextDue")}
              </Label>
              <Controller
                name="nextCheckDueAt"
                control={form.control}
                render={({ field }) => (
                  <FormDatePicker
                    id={`rtw-next-${workerId}`}
                    value={field.value ?? ""}
                    onChange={(v) => field.onChange(v)}
                    placeholder={t("workerDetail.rtwNextDuePlaceholder")}
                    locale={locale}
                  />
                )}
              />
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className={cn(
                "h-11 min-w-[11rem] font-semibold shadow-sm",
                "bg-brand-navy hover:bg-brand-navy/92"
              )}
            >
              {submitting ? t("workerDetail.rtwSaving") : t("workerDetail.rtwAdd")}
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
