"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FormProvider,
  useForm,
  useFormContext,
  Controller,
  type SubmitHandler,
} from "react-hook-form";
import { AlertTriangle, CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormDatePicker } from "@/components/workers/worker-form/FormDatePicker";
import { useTranslation } from "@/contexts/LanguageContext";
import type { SerializedUkLawCheck } from "@/lib/uk-law-check-utils";
import {
  assessNmwFromAnnualSalary,
  DEFAULT_NLW_HOURLY_GBP,
} from "@/lib/uk-law-nmw";
import { cn } from "@/lib/utils";

type Props = {
  workerId: string;
  defaultAnnualSalary: number;
};

const CONTRACT_VALUES = ["permanent", "fixed-term", "zero-hours", "part-time"] as const;

const FLAG_PRESETS = [
  "nmw_risk",
  "hours_exceeded",
  "no_contract",
  "holiday_deficit",
  "wtr_breach",
] as const;

export type UkLawRecordFormValues = {
  nmwCompliant: "unset" | "yes" | "no";
  hourlyRate: string;
  hoursPerWeek: string;
  weeklyHours: string;
  maxWeeklyHours: string;
  optOutSigned: boolean;
  annualEntitlement: string;
  daysTaken: string;
  daysRemaining: string;
  contractIssued: string;
  contractType: string;
  flags: string[];
};

function UkLawFormSection(props: {
  title: string;
  children: React.ReactNode;
  className?: string;
}): JSX.Element {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm",
        props.className
      )}
    >
      <div className="border-b border-slate-200/90 bg-slate-100/90 px-4 py-2.5">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
          {props.title}
        </h3>
      </div>
      <div className="grid gap-4 p-4 sm:grid-cols-2 sm:gap-x-5 sm:gap-y-4">
        {props.children}
      </div>
    </section>
  );
}

function FieldGridItem(props: {
  className?: string;
  children: React.ReactNode;
}): JSX.Element {
  return <div className={cn("space-y-2", props.className)}>{props.children}</div>;
}

function UkLawFlagsEditor(): JSX.Element {
  const { t } = useTranslation();
  const { watch, setValue } = useFormContext<UkLawRecordFormValues>();
  const [draft, setDraft] = useState("");
  const flags = watch("flags");

  function normalizeFlag(raw: string): string {
    return raw
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "");
  }

  function addFlag(raw: string): void {
    const s = normalizeFlag(raw);
    if (!s || flags.includes(s)) return;
    setValue("flags", [...flags, s], { shouldDirty: true });
    setDraft("");
  }

  function removeFlag(index: number): void {
    setValue(
      "flags",
      flags.filter((_, i) => i !== index),
      { shouldDirty: true }
    );
  }

  return (
    <div className="sm:col-span-2 space-y-3">
      <div className="flex flex-wrap gap-2">
        {flags.map((f, i) => (
          <Badge
            key={`${f}-${i}`}
            variant="outline"
            className="border-brand-navy/25 bg-brand-navy/[0.04] pl-2.5 pr-1 font-mono text-xs font-semibold text-brand-navy"
          >
            {f}
            <button
              type="button"
              className="ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded-md text-slate-500 hover:bg-slate-200/80 hover:text-slate-900"
              aria-label={t("common.close")}
              onClick={() => removeFlag(i)}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </Badge>
        ))}
        {flags.length === 0 ? (
          <span className="text-sm text-slate-500">{t("workerDetail.ukLaw.flagsHint")}</span>
        ) : null}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1 space-y-2">
          <Label htmlFor="uk-law-flag-draft">{t("workerDetail.ukLaw.flagsLabel")}</Label>
          <Input
            id="uk-law-flag-draft"
            className="h-11 border-slate-200 font-mono text-sm"
            value={draft}
            placeholder={t("workerDetail.ukLaw.flagPlaceholder")}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addFlag(draft);
              }
            }}
          />
        </div>
        <Button
          type="button"
          variant="secondary"
          className="h-11 shrink-0 sm:min-w-[6rem]"
          onClick={() => addFlag(draft)}
        >
          {t("workerDetail.ukLaw.flagAdd")}
        </Button>
      </div>
      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          {t("workerDetail.ukLaw.flagSuggested")}
        </p>
        <div className="flex flex-wrap gap-2">
          {FLAG_PRESETS.map((p) => {
            const labelKey = `workerDetail.ukLaw.flagPreset.${p}`;
            const label = t(labelKey);
            return (
              <button
                key={p}
                type="button"
                disabled={flags.includes(p)}
                onClick={() => addFlag(p)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  flags.includes(p)
                    ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                    : "border-brand-navy/20 bg-white text-brand-navy hover:border-brand-navy/40 hover:bg-slate-50"
                )}
              >
                {label === labelKey ? p : label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function UkLawComplianceTab(props: Props): JSX.Element {
  const { t, locale } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [check, setCheck] = useState<SerializedUkLawCheck | null>(null);

  const [quickSalary, setQuickSalary] = useState(String(props.defaultAnnualSalary));
  const [quickHours, setQuickHours] = useState("37.5");
  const [quickNlwRef, setQuickNlwRef] = useState(String(DEFAULT_NLW_HOURLY_GBP));

  const form = useForm<UkLawRecordFormValues>({
    defaultValues: {
      nmwCompliant: "unset",
      hourlyRate: "",
      hoursPerWeek: "",
      weeklyHours: "",
      maxWeeklyHours: "48",
      optOutSigned: false,
      annualEntitlement: "28",
      daysTaken: "",
      daysRemaining: "",
      contractIssued: "",
      contractType: "permanent",
      flags: [],
    },
  });

  const { reset, handleSubmit, control, register } = form;

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    const res = await fetch(`/api/workers/${props.workerId}/uk-law-checks`, {
      credentials: "include",
      cache: "no-store",
    });
    setLoading(false);
    if (!res.ok) return;
    const json = (await res.json()) as { data: SerializedUkLawCheck | null };
    setCheck(json.data);
  }, [props.workerId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setQuickSalary(String(props.defaultAnnualSalary));
  }, [props.defaultAnnualSalary]);

  useEffect(() => {
    if (loading) return;
    const row = check;
    reset({
      nmwCompliant:
        row?.nmwCompliant === null || row?.nmwCompliant === undefined
          ? "unset"
          : row.nmwCompliant
            ? "yes"
            : "no",
      hourlyRate: row?.hourlyRate ?? "",
      hoursPerWeek: row?.hoursPerWeek ?? "",
      weeklyHours: row?.weeklyHours ?? "",
      maxWeeklyHours: row?.maxWeeklyHours ?? "48",
      optOutSigned: row?.optOutSigned ?? false,
      annualEntitlement: row?.annualEntitlement ?? "28",
      daysTaken: row?.daysTaken ?? "",
      daysRemaining: row?.daysRemaining ?? "",
      contractIssued: row?.contractIssued ? row.contractIssued.slice(0, 10) : "",
      contractType: row?.contractType ?? "permanent",
      flags: row?.flags ? [...row.flags] : [],
    });
  }, [loading, check, reset]);

  const nmwRefN = Number(quickNlwRef);
  const salaryN = Number(quickSalary);
  const hoursN = Number(quickHours);
  const nmwPreview = useMemo(() => {
    if (!Number.isFinite(nmwRefN) || !Number.isFinite(salaryN) || !Number.isFinite(hoursN)) {
      return null;
    }
    return assessNmwFromAnnualSalary(salaryN, hoursN, nmwRefN);
  }, [nmwRefN, salaryN, hoursN]);

  const onSave: SubmitHandler<UkLawRecordFormValues> = async (values) => {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        optOutSigned: values.optOutSigned,
        contractType: values.contractType,
        flags: values.flags,
        maxWeeklyHours: values.maxWeeklyHours.trim() || undefined,
        annualEntitlement: values.annualEntitlement.trim() || undefined,
      };
      if (values.nmwCompliant === "yes") body.nmwCompliant = true;
      else if (values.nmwCompliant === "no") body.nmwCompliant = false;
      else body.nmwCompliant = null;

      body.hourlyRate = values.hourlyRate.trim() || null;
      body.hoursPerWeek = values.hoursPerWeek.trim() || null;
      body.weeklyHours = values.weeklyHours.trim() || null;
      body.daysTaken = values.daysTaken.trim() || null;
      body.daysRemaining = values.daysRemaining.trim() || null;
      body.contractIssued = values.contractIssued.trim() || null;

      const res = await fetch(`/api/workers/${props.workerId}/uk-law-checks`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        alert(j.error ?? t("workerDetail.ukLaw.saveFailed"));
        return;
      }
      await load();
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6" aria-busy="true" aria-live="polite">
        <p className="text-sm text-slate-600">{t("workerDetail.ukLaw.loading")}</p>
        <div className="h-56 animate-pulse rounded-2xl bg-slate-200/70" />
        <div className="h-80 animate-pulse rounded-2xl bg-slate-200/60" />
      </div>
    );
  }

  const refRateText = nmwPreview
    ? t("workerDetail.ukLaw.vsReference").replace(
        "{rate}",
        nmwPreview.referenceNlwHourlyGbp.toFixed(2)
      )
    : "";

  const lastUpdated =
    check &&
    new Date(check.updatedAt).toLocaleString(locale === "tr" ? "tr-TR" : "en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
    });

  return (
    <div className="space-y-8 pb-6">
      <Card
        className={cn(
          "overflow-hidden border-2 shadow-md",
          nmwPreview?.compliant
            ? "border-emerald-300/70 ring-1 ring-emerald-400/35"
            : nmwPreview && !nmwPreview.compliant
              ? "border-red-300/70 ring-1 ring-red-400/30"
              : "border-brand-navy/20 ring-1 ring-brand-navy/10"
        )}
      >
        <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-brand-navy/[0.06] via-white to-sky-50/40 pb-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-xl text-brand-navy">
                {t("workerDetail.ukLaw.nmwCardTitle")}
              </CardTitle>
              <CardDescription className="mt-2 max-w-2xl text-sm leading-relaxed">
                {t("workerDetail.ukLaw.nmwCardHint")}
              </CardDescription>
            </div>
            <Badge variant="outline" className="shrink-0 font-mono text-[10px] uppercase tracking-wide">
              NLW ref £{DEFAULT_NLW_HOURLY_GBP}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 p-5 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="uk-nmw-salary">{t("workerDetail.ukLaw.nmwSalary")}</Label>
              <Input
                id="uk-nmw-salary"
                type="number"
                step="1"
                className="h-11 border-slate-200"
                value={quickSalary}
                onChange={(e) => setQuickSalary(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="uk-nmw-hours">{t("workerDetail.ukLaw.nmwHours")}</Label>
              <Input
                id="uk-nmw-hours"
                type="number"
                step="0.25"
                className="h-11 border-slate-200"
                value={quickHours}
                onChange={(e) => setQuickHours(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="uk-nmw-ref">{t("workerDetail.ukLaw.nmwReference")}</Label>
              <Input
                id="uk-nmw-ref"
                type="number"
                step="0.01"
                className="h-11 border-slate-200"
                value={quickNlwRef}
                onChange={(e) => setQuickNlwRef(e.target.value)}
              />
            </div>
          </div>

          {nmwPreview && !Number.isNaN(nmwPreview.impliedHourly) ? (
            <div
              className={cn(
                "rounded-2xl border-2 p-5 sm:p-6",
                nmwPreview.compliant
                  ? "border-emerald-400/60 bg-gradient-to-br from-emerald-50 via-white to-emerald-50/50"
                  : "border-red-400/60 bg-gradient-to-br from-red-50 via-white to-amber-50/40"
              )}
            >
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                    {t("workerDetail.ukLaw.impliedHourly")}
                  </p>
                  <p className="text-4xl font-extrabold tabular-nums tracking-tight text-brand-navy sm:text-5xl">
                    £{nmwPreview.impliedHourly.toFixed(2)}
                    <span className="ml-1 text-lg font-semibold text-slate-500">/h</span>
                  </p>
                  <p className="text-sm text-slate-600">{refRateText}</p>
                </div>
                <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
                  <div
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold shadow-sm",
                      nmwPreview.compliant
                        ? "bg-emerald-600 text-white ring-2 ring-emerald-300/60"
                        : "bg-red-600 text-white ring-2 ring-red-300/60"
                    )}
                  >
                    {nmwPreview.compliant ? (
                      <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden />
                    ) : (
                      <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden />
                    )}
                    {nmwPreview.compliant
                      ? t("workerDetail.ukLaw.compliantYes")
                      : t("workerDetail.ukLaw.compliantNo")}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50/80 px-4 py-6 text-center text-sm text-slate-600">
              {t("workerDetail.ukLaw.enterValid")}
            </p>
          )}
        </CardContent>
      </Card>

      <FormProvider {...form}>
        <form
          onSubmit={handleSubmit(onSave)}
          className="space-y-6"
          noValidate
        >
          <Card className="border-slate-200/90 shadow-md ring-1 ring-slate-200/40">
            <CardHeader className="border-b border-slate-100 bg-slate-50/60">
              <CardTitle className="text-lg text-brand-navy">
                {t("workerDetail.ukLaw.recordTitle")}
              </CardTitle>
              <CardDescription className="text-sm leading-relaxed">
                {t("workerDetail.ukLaw.recordIntro")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 p-4 sm:p-6">
              <UkLawFormSection title={t("workerDetail.ukLaw.sectionPay")}>
                <FieldGridItem>
                  <Label>{t("workerDetail.ukLaw.nmwCompliant")}</Label>
                  <Controller
                    name="nmwCompliant"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger className="h-11 border-slate-200 bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unset">{t("workerDetail.ukLaw.nmwUnset")}</SelectItem>
                          <SelectItem value="yes">{t("workerDetail.ukLaw.nmwYes")}</SelectItem>
                          <SelectItem value="no">{t("workerDetail.ukLaw.nmwNo")}</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </FieldGridItem>
                <FieldGridItem>
                  <Label htmlFor="uk-hourly">{t("workerDetail.ukLaw.hourlyRate")}</Label>
                  <Input
                    id="uk-hourly"
                    className="h-11 border-slate-200"
                    placeholder="12.50"
                    {...register("hourlyRate")}
                  />
                </FieldGridItem>
                <FieldGridItem>
                  <Label htmlFor="uk-hpw">{t("workerDetail.ukLaw.hoursPerWeek")}</Label>
                  <Input
                    id="uk-hpw"
                    className="h-11 border-slate-200"
                    placeholder="37.5"
                    {...register("hoursPerWeek")}
                  />
                </FieldGridItem>
                <FieldGridItem>
                  <Label htmlFor="uk-wh">{t("workerDetail.ukLaw.weeklyHours")}</Label>
                  <Input
                    id="uk-wh"
                    className="h-11 border-slate-200"
                    {...register("weeklyHours")}
                  />
                </FieldGridItem>
                <FieldGridItem>
                  <Label htmlFor="uk-max">{t("workerDetail.ukLaw.maxWeeklyHours")}</Label>
                  <Input
                    id="uk-max"
                    className="h-11 border-slate-200"
                    {...register("maxWeeklyHours")}
                  />
                </FieldGridItem>
                <FieldGridItem className="flex items-end pb-1 sm:col-span-2">
                  <Controller
                    name="optOutSigned"
                    control={control}
                    render={({ field }) => (
                      <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200/90 bg-slate-50/50 px-4 py-3">
                        <input
                          type="checkbox"
                          className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-navy focus:ring-brand-navy"
                          checked={field.value}
                          onChange={(e) => field.onChange(e.target.checked)}
                        />
                        <span className="text-sm font-medium leading-snug text-slate-800">
                          {t("workerDetail.ukLaw.optOut")}
                        </span>
                      </label>
                    )}
                  />
                </FieldGridItem>
              </UkLawFormSection>

              <UkLawFormSection title={t("workerDetail.ukLaw.sectionHoliday")}>
                <FieldGridItem>
                  <Label htmlFor="uk-ent">{t("workerDetail.ukLaw.annualEntitlement")}</Label>
                  <Input
                    id="uk-ent"
                    className="h-11 border-slate-200"
                    {...form.register("annualEntitlement")}
                  />
                </FieldGridItem>
                <FieldGridItem>
                  <Label htmlFor="uk-taken">{t("workerDetail.ukLaw.daysTaken")}</Label>
                  <Input
                    id="uk-taken"
                    className="h-11 border-slate-200"
                    {...register("daysTaken")}
                  />
                </FieldGridItem>
                <FieldGridItem>
                  <Label htmlFor="uk-rem">{t("workerDetail.ukLaw.daysRemaining")}</Label>
                  <Input
                    id="uk-rem"
                    className="h-11 border-slate-200"
                    {...register("daysRemaining")}
                  />
                </FieldGridItem>
              </UkLawFormSection>

              <UkLawFormSection title={t("workerDetail.ukLaw.sectionContract")}>
                <FieldGridItem>
                  <Label htmlFor="uk-contract-date">{t("workerDetail.ukLaw.contractIssued")}</Label>
                  <Controller
                    name="contractIssued"
                    control={control}
                    render={({ field }) => (
                      <FormDatePicker
                        id="uk-contract-date"
                        value={field.value}
                        onChange={field.onChange}
                        placeholder={t("workerDetail.ukLaw.contractIssued")}
                        locale={locale}
                        className="border-slate-200"
                      />
                    )}
                  />
                </FieldGridItem>
                <FieldGridItem>
                  <Label>{t("workerDetail.ukLaw.contractType")}</Label>
                  <Controller
                    name="contractType"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="h-11 border-slate-200 bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CONTRACT_VALUES.map((v) => (
                            <SelectItem key={v} value={v}>
                              {t(`workerDetail.ukLaw.contract.${v}`)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </FieldGridItem>
              </UkLawFormSection>

              <UkLawFormSection title={t("workerDetail.ukLaw.sectionFlags")}>
                <UkLawFlagsEditor />
              </UkLawFormSection>

              {lastUpdated ? (
                <p className="text-xs text-slate-500">
                  {t("workerDetail.ukLaw.lastUpdated").replace("{date}", lastUpdated)}
                </p>
              ) : null}
            </CardContent>
          </Card>

          <div
            className={cn(
              "sticky bottom-0 z-20 -mx-1 mt-2 flex flex-col gap-3 rounded-xl border border-slate-200/90",
              "bg-white/95 p-4 shadow-[0_-4px_24px_-8px_rgba(15,23,42,0.2)] backdrop-blur-md sm:flex-row sm:items-center sm:justify-between"
            )}
          >
            <p className="text-xs text-slate-500 sm:max-w-md">
              {t("workerDetail.ukLaw.saveBarHint")}
            </p>
            <Button
              type="submit"
              disabled={saving}
              className="h-12 min-w-[14rem] shrink-0 px-8 text-base font-semibold shadow-md"
            >
              {saving ? t("workerDetail.ukLaw.saving") : t("workerDetail.ukLaw.save")}
            </Button>
          </div>
        </form>
      </FormProvider>
    </div>
  );
}
