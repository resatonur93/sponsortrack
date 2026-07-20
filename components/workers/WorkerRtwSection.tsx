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
import { uploadWithPresign } from "@/lib/client/upload-with-presign";

type RtwFormValues = z.infer<typeof rtwCheckCreateSchema>;
type WizardStep = 1 | 2 | 3;

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

function requiresEvidenceUpload(method: RtwCheckMethod): boolean {
  return method !== "ONLINE_SHARE_CODE";
}

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

const DEFAULT_VALUES: RtwFormValues = {
  checkedAt: "",
  checkMethod: "ONLINE_SHARE_CODE",
  outcomeSummary: "",
  shareCodeUsed: "",
  notes: "",
  evidenceDocumentId: null,
  nextCheckDueAt: "",
};

export function WorkerRtwSection(props: {
  workerId: string;
  rtwChecks: RightToWorkCheck[];
  onDone: () => void;
}): JSX.Element {
  const { workerId, rtwChecks, onDone } = props;
  const { t, locale } = useTranslation();
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [evidenceFileName, setEvidenceFileName] = useState<string | null>(null);
  const [step, setStep] = useState<WizardStep>(1);

  const form = useForm<RtwFormValues>({
    resolver: zodResolver(rtwCheckCreateSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const method = form.watch("checkMethod");
  const shareCodeUsed = form.watch("shareCodeUsed");
  const evidenceDocumentId = form.watch("evidenceDocumentId");

  const needsEvidence = requiresEvidenceUpload(method);
  const step2Complete = needsEvidence
    ? !!evidenceDocumentId
    : !!shareCodeUsed?.trim();

  function resetWizard(): void {
    form.reset(DEFAULT_VALUES);
    setEvidenceFileName(null);
    setUploadError(null);
    setStep(1);
  }

  async function handleEvidenceFile(file: File | null): Promise<void> {
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const uploaded = await uploadWithPresign({
        workerId,
        folder: "RIGHT_TO_WORK",
        file,
        t,
      });
      const res = await fetch(`/api/workers/${workerId}/documents`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder: "RIGHT_TO_WORK", ...uploaded }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? t("documentVault.uploadFailed"));
      }
      const json = (await res.json()) as { data: { id: string } };
      form.setValue("evidenceDocumentId", json.data.id, { shouldValidate: true });
      setEvidenceFileName(file.name);
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : t("documentVault.uploadFailed"));
    } finally {
      setUploading(false);
    }
  }

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
      resetWizard();
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
                  {r.evidenceDocumentId ? (
                    <p className="mt-2 text-xs text-slate-600">
                      {t("workerDetail.rtwEvidenceOnFile")}
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
          <div className="mb-4 flex items-center gap-2">
            {([1, 2, 3] as WizardStep[]).map((s) => (
              <div
                key={s}
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold",
                  s === step
                    ? "bg-brand-navy text-white"
                    : s < step
                      ? "bg-brand-navy/20 text-brand-navy"
                      : "bg-slate-100 text-slate-500"
                )}
              >
                {s}
              </div>
            ))}
            <span className="ml-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {t(`workerDetail.rtwWizardStep${step}`)}
            </span>
          </div>

          <form
            onSubmit={form.handleSubmit((v) => void onSubmit(v))}
            className="space-y-5"
          >
            {step === 1 ? (
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
            ) : null}

            {step === 2 ? (
              <div className="space-y-5">
                {needsEvidence ? (
                  <div className="grid gap-2">
                    <Label htmlFor={`rtw-evidence-${workerId}`}>
                      {t("workerDetail.rtwEvidenceLabel")}
                    </Label>
                    <Input
                      id={`rtw-evidence-${workerId}`}
                      type="file"
                      disabled={uploading}
                      onChange={(e) => void handleEvidenceFile(e.target.files?.[0] ?? null)}
                    />
                    {uploading ? (
                      <p className="text-xs text-slate-500">{t("documentVault.uploading")}</p>
                    ) : evidenceFileName ? (
                      <p className="text-xs font-medium text-emerald-700">
                        {t("workerDetail.rtwEvidenceUploaded")}: {evidenceFileName}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-500">
                        {t("workerDetail.rtwEvidenceHint")}
                      </p>
                    )}
                    {uploadError ? (
                      <p className="text-xs text-red-700">{uploadError}</p>
                    ) : null}
                  </div>
                ) : (
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
                )}

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
              </div>
            ) : null}

            {step === 3 ? (
              <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-sm">
                <p>
                  <span className="font-medium text-slate-700">
                    {t("workerDetail.rtwMethod")}:
                  </span>{" "}
                  {t(RTW_METHOD_LABEL_KEY[method])}
                </p>
                {needsEvidence ? (
                  <p>
                    <span className="font-medium text-slate-700">
                      {t("workerDetail.rtwEvidenceLabel")}:
                    </span>{" "}
                    {evidenceFileName ?? "—"}
                  </p>
                ) : (
                  <p>
                    <span className="font-medium text-slate-700">
                      {t("workerDetail.rtwPlaceholderShare")}:
                    </span>{" "}
                    {shareCodeUsed || "—"}
                  </p>
                )}
                <p>
                  <span className="font-medium text-slate-700">
                    {t("workerDetail.rtwOutcomeLabel")}:
                  </span>{" "}
                  {form.getValues("outcomeSummary") || "—"}
                </p>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2 pt-2">
              {step > 1 ? (
                <Button
                  type="button"
                  variant="outline"
                  className="h-11"
                  onClick={() => setStep((s) => (s - 1) as WizardStep)}
                >
                  {t("workerDetail.rtwWizardBack")}
                </Button>
              ) : null}
              {step < 3 ? (
                <Button
                  type="button"
                  disabled={step === 2 && !step2Complete}
                  className={cn(
                    "h-11 min-w-[8.5rem] font-semibold shadow-sm",
                    "bg-brand-navy hover:bg-brand-navy/92"
                  )}
                  onClick={() => setStep((s) => (s + 1) as WizardStep)}
                >
                  {t("workerDetail.rtwWizardNext")}
                </Button>
              ) : (
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
              )}
            </div>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
