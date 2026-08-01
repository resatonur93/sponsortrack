"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { EmploymentStatus } from "@prisma/client";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { workerCreateSchema } from "@/lib/schemas";
import type { z } from "zod";
import {
  NATIONALITY_PRESET_META,
  PHONE_PREFIXES,
  SOC_CODE_OPTIONS,
  VISA_TYPE_OPTIONS,
  WORK_LOCATION_OPTIONS,
  COMMON_JOB_TITLES,
  type NationalityPreset,
} from "@/lib/worker-form/options";
import { WORKER_FORM_STEP_KEYS } from "@/lib/worker-form/steps";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FormDatePicker } from "@/components/workers/worker-form/FormDatePicker";
import { CosReferenceCombobox } from "@/components/workers/worker-form/CosReferenceCombobox";
import { useTranslation } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

const schema = workerCreateSchema;
type FormValues = z.infer<typeof schema>;

const STEP_COUNT = 4;

const NEW_WORKER_STATUSES: EmploymentStatus[] = [
  EmploymentStatus.PENDING_START,
  EmploymentStatus.ACTIVE,
  EmploymentStatus.SUSPENDED,
];

function maskDocNumber(raw: string, maxLen: number): string {
  return raw
    .replace(/[^A-Za-z0-9]/g, "")
    .toUpperCase()
    .slice(0, maxLen);
}

function normalizePayload(values: FormValues): FormValues {
  const n = { ...values } as Record<string, unknown>;
  const stripToNull = [
    "phone",
    "workPhone",
    "personalEmail",
    "dateOfBirth",
    "passportNumber",
    "brpNumber",
    "nationalInsuranceNumber",
    "jobDescription",
    "contractJobDescription",
    "actualDayToDayDuties",
    "occupationCodeJustification",
    "vesselName",
    "visaStartDate",
    "visaExpiryDate",
    "employmentStartDate",
    "lineManagerId",
    "lineManagerName",
    "lineManagerEmail",
    "emergencyContact",
    "emergencyPhone",
    "rightToWorkLastCheckedAt",
    "sponsorshipStartDate",
    "sponsorshipEndDate",
    "salaryReductionJustification",
  ] as const;
  for (const k of stripToNull) {
    if (n[k] === "") n[k] = null;
  }
  return n as FormValues;
}

export function WorkerForm(): JSX.Element {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const [step, setStep] = React.useState(0);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  const [nationalityPreset, setNationalityPreset] =
    React.useState<NationalityPreset>("UK");
  const [phonePrefix, setPhonePrefix] = React.useState("+44");
  const [phoneBody, setPhoneBody] = React.useState("");

  const stepLabels = [
    t("workerForm.step.personal"),
    t("workerForm.step.visa"),
    t("workerForm.step.job"),
    t("workerForm.step.summary"),
  ] as const;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onBlur",
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      nationality: NATIONALITY_PRESET_META.UK,
      currentAddress: "",
      employmentStatus: EmploymentStatus.PENDING_START,
      salary: 30_000,
      isOffshoreWorker: false,
      visaType: VISA_TYPE_OPTIONS[0]?.value ?? "Skilled Worker",
      occupationCode: String(SOC_CODE_OPTIONS[0] ?? ""),
      jobTitle: String(COMMON_JOB_TITLES[0] ?? ""),
      workLocation: String(WORK_LOCATION_OPTIONS[0] ?? ""),
      jobDescription: "",
      cosReference: "",
      cosAssignDate: "",
      cosExpiryDate: "",
      visaStartDate: null,
      visaExpiryDate: null,
    },
  });

  React.useEffect(() => {
    const digits = phoneBody.replace(/\D/g, "");
    const prefix = phonePrefix === "__raw__" ? "" : phonePrefix;
    if (!digits && !prefix) {
      form.setValue("phone", null);
      return;
    }
    form.setValue("phone", digits ? `${prefix}${digits}` : null, {
      shouldValidate: false,
      shouldDirty: false,
      shouldTouch: false,
    });
  }, [phonePrefix, phoneBody, form]);

  async function submit(values: FormValues): Promise<void> {
    setSubmitError(null);
    setSaving(true);
    const payload = normalizePayload(values);
    const res = await fetch("/api/workers", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as {
        error?: string;
        errorTr?: string;
      };
      setSubmitError(j.errorTr ?? j.error ?? t("workerForm.error"));
      return;
    }
    const json = (await res.json()) as { data: { id: string } };
    router.push(`/workers/${json.data.id}`);
  }

  async function goNext(): Promise<void> {
    const keys = WORKER_FORM_STEP_KEYS[step] as unknown as Parameters<
      typeof form.trigger
    >[0];
    const ok = await form.trigger(keys);
    if (!ok) return;
    setStep((s) => Math.min(STEP_COUNT - 1, s + 1));
  }

  const progressPct =
    STEP_COUNT <= 1 ? 100 : ((step + 1) / STEP_COUNT) * 100;

  const visaPresetOnly = React.useMemo<string[]>(
    () => [...VISA_TYPE_OPTIONS.map((o) => o.value)],
    []
  );
  const vtRaw = form.watch("visaType") ?? "";
  const visaSelectValue =
    vtRaw !== "" && visaPresetOnly.includes(vtRaw) ? vtRaw : "__CUSTOM__";

  React.useEffect(() => {
    if (nationalityPreset === "OTHER") return;
    if (nationalityPreset === "UK") {
      form.setValue("nationality", NATIONALITY_PRESET_META.UK);
    } else if (nationalityPreset === "TR") {
      form.setValue("nationality", NATIONALITY_PRESET_META.TR);
    }
  }, [nationalityPreset, form]);

  return (
    <form
      onSubmit={form.handleSubmit(submit)}
      className="mx-auto max-w-3xl space-y-6"
      noValidate
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-brand-navy">
            {t("workerForm.title")}
          </h2>
          <p className="text-sm text-slate-600">{t("workerForm.subtitle")}</p>
        </div>
        <Button variant="outline" size="sm" className="w-full sm:w-auto" asChild>
          <Link href="/workers">{t("workerForm.backList")}</Link>
        </Button>
      </div>

      <Card className="overflow-hidden border-slate-200/90 shadow-lg">
        <CardHeader className="border-b border-slate-100 bg-slate-50/70 pb-6">
          <div className="mb-6 space-y-2">
            <div className="flex items-center justify-between gap-4 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
              <span>
                {t("workerForm.progress")
                  .replace("{current}", String(step + 1))
                  .replace("{total}", String(STEP_COUNT))}
              </span>
              <span className="tabular-nums">{Math.round(progressPct)}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand-navy to-teal-600 transition-all duration-500 ease-out"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
          <nav
            aria-label="Form steps"
            className="flex flex-wrap items-stretch gap-2 sm:flex-nowrap"
          >
            {stepLabels.map((label, i) => {
              const done = i < step;
              const active = i === step;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={async () => {
                    if (i < step) {
                      setStep(i);
                      return;
                    }
                    if (i > step) {
                      for (let s = step; s < i; s++) {
                        const keys = WORKER_FORM_STEP_KEYS[s] as Parameters<
                          typeof form.trigger
                        >[0];
                        const ok = await form.trigger(keys);
                        if (!ok) return;
                      }
                      setStep(i);
                    }
                  }}
                  className={cn(
                    "flex min-h-[52px] min-w-[6.5rem] flex-1 items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm font-medium transition-colors",
                    active &&
                      "border-brand-navy bg-white text-brand-navy shadow-md ring-2 ring-brand-navy/10",
                    done &&
                      !active &&
                      "border-emerald-200 bg-emerald-50/70 text-emerald-900 hover:bg-emerald-50",
                    !active &&
                      !done &&
                      "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  )}
                >
                  {done ? (
                    <Check
                      className="h-4 w-4 shrink-0 text-emerald-700"
                      aria-hidden
                    />
                  ) : (
                    <span
                      className={cn(
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs tabular-nums",
                        active
                          ? "bg-brand-navy text-white"
                          : "bg-slate-200 text-slate-700"
                      )}
                      aria-hidden
                    >
                      {i + 1}
                    </span>
                  )}
                  <span className="leading-tight">{label}</span>
                </button>
              );
            })}
          </nav>
        </CardHeader>

        <CardContent className="space-y-6 p-5 sm:p-8">
          {step === 0 ? (
            <section className="space-y-4" aria-labelledby="wf-personal">
              <h3 id="wf-personal" className="sr-only">
                {t("workerForm.section.personal")}
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="firstName">{t("workerForm.firstName")}</Label>
                  <Input
                    id="firstName"
                    className="h-11 border-slate-300/95"
                    {...form.register("firstName")}
                  />
                  <FieldErr msg={form.formState.errors.firstName?.message} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lastName">{t("workerForm.lastName")}</Label>
                  <Input
                    id="lastName"
                    className="h-11 border-slate-300/95"
                    {...form.register("lastName")}
                  />
                  <FieldErr msg={form.formState.errors.lastName?.message} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="email">{t("workerForm.email")}</Label>
                  <Input
                    id="email"
                    type="email"
                    className="h-11 border-slate-300/95"
                    {...form.register("email")}
                  />
                  <FieldErr msg={form.formState.errors.email?.message} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>{t("workerForm.nationality")}</Label>
                  <Select
                    value={nationalityPreset}
                    onValueChange={(v) => {
                      const p = v as NationalityPreset;
                      setNationalityPreset(p);
                      if (p === "OTHER") form.setValue("nationality", "");
                    }}
                  >
                    <SelectTrigger className="h-11 border-slate-300/95">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UK">{t("workerForm.nat.uk")}</SelectItem>
                      <SelectItem value="TR">{t("workerForm.nat.tr")}</SelectItem>
                      <SelectItem value="OTHER">
                        {t("workerForm.nat.other")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {nationalityPreset === "OTHER" ? (
                    <div className="space-y-1.5 pt-1">
                      <Label htmlFor="nationality">{t("workerForm.nat.custom")}</Label>
                      <Input
                        id="nationality"
                        className="h-11 border-slate-300/95"
                        {...form.register("nationality")}
                      />
                      <FieldErr msg={form.formState.errors.nationality?.message} />
                    </div>
                  ) : (
                    form.formState.errors.nationality ? (
                      <FieldErr msg={form.formState.errors.nationality.message} />
                    ) : null
                  )}
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>{t("workerForm.phone")}</Label>
                  <p className="text-xs text-slate-500">{t("workerForm.phoneHint")}</p>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Select value={phonePrefix} onValueChange={setPhonePrefix}>
                      <SelectTrigger className="h-11 w-full border-slate-300/95 sm:w-[11rem]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PHONE_PREFIXES.map((p) => (
                          <SelectItem key={p.value || "none"} value={p.value}>
                            {t(p.labelKey)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      className="h-11 flex-1 border-slate-300/95"
                      inputMode="tel"
                      autoComplete="tel-national"
                      placeholder={t("workerForm.phoneNumber")}
                      value={phoneBody}
                      onChange={(e) => setPhoneBody(e.target.value)}
                    />
                  </div>
                  <FieldErr msg={form.formState.errors.phone?.message as string | undefined} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>{t("workerForm.dob")}</Label>
                  <Controller
                    control={form.control}
                    name="dateOfBirth"
                    render={({ field }) => (
                      <FormDatePicker
                        value={field.value ?? ""}
                        onChange={field.onChange}
                        locale={locale}
                        placeholder={t("workerForm.pickDate")}
                        endMonth={new Date(new Date().getFullYear() - 16, 11, 31)}
                      />
                    )}
                  />
                  <FieldErr msg={form.formState.errors.dateOfBirth?.message} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="passport">{t("workerForm.passport")}</Label>
                  <p className="text-xs text-slate-500">{t("workerForm.passportHint")}</p>
                  <Input
                    id="passport"
                    className="h-11 border-slate-300/95 font-mono uppercase tracking-wide"
                    {...form.register("passportNumber", {
                      onChange: (e) => {
                        e.target.value = maskDocNumber(e.target.value, 14);
                      },
                    })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="brp">{t("workerForm.brp")}</Label>
                  <p className="text-xs text-slate-500">{t("workerForm.brpHint")}</p>
                  <Input
                    id="brp"
                    className="h-11 border-slate-300/95 font-mono uppercase tracking-wide"
                    {...form.register("brpNumber", {
                      onChange: (e) => {
                        e.target.value = maskDocNumber(e.target.value, 20);
                      },
                    })}
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="currentAddress">{t("workerForm.currentAddress")}</Label>
                  <textarea
                    id="currentAddress"
                    className="min-h-[72px] w-full rounded-md border border-slate-300/95 bg-transparent px-3 py-2 text-sm shadow-sm outline-none ring-brand-navy/20 focus-visible:ring-2"
                    {...form.register("currentAddress")}
                  />
                  <FieldErr msg={form.formState.errors.currentAddress?.message} />
                </div>
              </div>
            </section>
          ) : null}

          {step === 1 ? (
            <section className="space-y-4" aria-labelledby="wf-visa">
              <h3 id="wf-visa" className="sr-only">
                {t("workerForm.section.visa")}
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>{t("workerForm.visaType")}</Label>
                  <Select
                    value={visaSelectValue}
                    onValueChange={(v) => {
                      if (v === "__CUSTOM__") form.setValue("visaType", "");
                      else form.setValue("visaType", v);
                    }}
                  >
                    <SelectTrigger className="h-11 border-slate-300/95">
                      <SelectValue placeholder={t("workerForm.visaType")} />
                    </SelectTrigger>
                    <SelectContent>
                      {VISA_TYPE_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {t(o.labelKey)}
                        </SelectItem>
                      ))}
                      <SelectItem value="__CUSTOM__">
                        {t("workerForm.visa.other")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {visaSelectValue === "__CUSTOM__" ? (
                    <div className="pt-1">
                      <Input
                        className="h-11 border-slate-300/95"
                        placeholder={t("workerForm.nat.custom")}
                        {...form.register("visaType")}
                      />
                    </div>
                  ) : null}
                  <FieldErr msg={form.formState.errors.visaType?.message} />
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="cosRef">{t("workerForm.cosRef")}</Label>
                  <p className="text-xs text-slate-500">{t("workerForm.cosRefHint")}</p>
                  <CosReferenceCombobox
                    value={form.watch("cosReference")}
                    onChange={(v) => form.setValue("cosReference", v)}
                    placeholder={t("workerForm.cosRef")}
                    searchPlaceholder={t("workerForm.cosSearch")}
                    emptyHint={t("workerForm.cosEmpty")}
                    pickFromTenant={t("workerForm.cosPick")}
                  />
                  <FieldErr msg={form.formState.errors.cosReference?.message} />
                </div>

                <div className="space-y-1.5">
                  <Label>{t("workerForm.cosAssign")}</Label>
                  <Controller
                    control={form.control}
                    name="cosAssignDate"
                    render={({ field }) => (
                      <FormDatePicker
                        value={field.value}
                        onChange={field.onChange}
                        locale={locale}
                        placeholder={t("workerForm.pickDate")}
                      />
                    )}
                  />
                  <FieldErr msg={form.formState.errors.cosAssignDate?.message} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("workerForm.cosExpiry")}</Label>
                  <Controller
                    control={form.control}
                    name="cosExpiryDate"
                    render={({ field }) => (
                      <FormDatePicker
                        value={field.value}
                        onChange={field.onChange}
                        locale={locale}
                        placeholder={t("workerForm.pickDate")}
                      />
                    )}
                  />
                  <FieldErr msg={form.formState.errors.cosExpiryDate?.message} />
                </div>
                <div className="space-y-1.5">
                  <Label>
                    {t("workerForm.visaStart")}{" "}
                    <span className="font-normal text-slate-400">
                      ({t("workerForm.optional")})
                    </span>
                  </Label>
                  <Controller
                    control={form.control}
                    name="visaStartDate"
                    render={({ field }) => (
                      <FormDatePicker
                        value={field.value ?? ""}
                        onChange={field.onChange}
                        locale={locale}
                        placeholder={t("workerForm.pickDate")}
                      />
                    )}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>
                    {t("workerForm.visaExpiry")}{" "}
                    <span className="font-normal text-slate-400">
                      ({t("workerForm.optional")})
                    </span>
                  </Label>
                  <Controller
                    control={form.control}
                    name="visaExpiryDate"
                    render={({ field }) => (
                      <FormDatePicker
                        value={field.value ?? ""}
                        onChange={field.onChange}
                        locale={locale}
                        placeholder={t("workerForm.pickDate")}
                      />
                    )}
                  />
                </div>
              </div>
            </section>
          ) : null}

          {step === 2 ? (
            <section className="space-y-4" aria-labelledby="wf-job">
              <h3 id="wf-job" className="sr-only">
                {t("workerForm.section.job")}
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="jobTitle">{t("workerForm.jobTitle")}</Label>
                  <p className="text-xs text-slate-500">
                    {t("workerForm.jobTitleCustom")}
                  </p>
                  <Input
                    id="jobTitle"
                    list="worker-new-job-titles"
                    className="h-11 border-slate-300/95"
                    {...form.register("jobTitle")}
                  />
                  <datalist id="worker-new-job-titles">
                    {COMMON_JOB_TITLES.map((jt) => (
                      <option key={jt} value={jt} />
                    ))}
                  </datalist>
                  <FieldErr msg={form.formState.errors.jobTitle?.message} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>{t("workerForm.jobDescription")}</Label>
                  <textarea
                    className="min-h-[96px] w-full rounded-md border border-slate-300/95 bg-transparent px-3 py-2 text-sm shadow-sm outline-none ring-brand-navy/20 focus-visible:ring-2"
                    {...form.register("jobDescription")}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="soc">{t("workerForm.soc")}</Label>
                  <p className="text-xs text-slate-500">{t("workerForm.socHint")}</p>
                  <Input
                    id="soc"
                    list="worker-new-soc"
                    inputMode="numeric"
                    className="h-11 border-slate-300/95 font-mono text-sm tracking-wide"
                    {...form.register("occupationCode")}
                  />
                  <datalist id="worker-new-soc">
                    {SOC_CODE_OPTIONS.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                  <FieldErr msg={form.formState.errors.occupationCode?.message} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="salary">{t("workerForm.salary")}</Label>
                  <div className="relative flex items-center gap-2">
                    <span className="absolute left-3 top-1/2 z-10 -translate-y-1/2 select-none font-semibold text-slate-600">
                      £
                    </span>
                    <Input
                      id="salary"
                      type="number"
                      className="h-11 border-slate-300/95 pl-8 tabular-nums"
                      {...form.register("salary", { valueAsNumber: true })}
                      min={0}
                      step={500}
                    />
                    <span className="hidden text-xs font-medium uppercase text-slate-500 sm:inline">
                      {t("workerForm.gbp")}
                    </span>
                  </div>
                  <FieldErr msg={form.formState.errors.salary?.message} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="contractedHoursPerWeek">
                    {t("workerForm.contractedHoursPerWeek")}
                  </Label>
                  <Input
                    id="contractedHoursPerWeek"
                    type="number"
                    className="h-11 border-slate-300/95 tabular-nums"
                    {...form.register("contractedHoursPerWeek", {
                      setValueAs: (v) => (v === "" ? null : Number(v)),
                    })}
                    min={0}
                    step={1}
                    placeholder={t("workerForm.contractedHoursPerWeekPlaceholder")}
                  />
                  <FieldErr msg={form.formState.errors.contractedHoursPerWeek?.message} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="applicableSalaryThreshold">
                    {t("workerForm.applicableSalaryThreshold")}
                  </Label>
                  <p className="text-xs text-slate-500">
                    {t("workerForm.applicableSalaryThresholdHint")}
                  </p>
                  <Input
                    id="applicableSalaryThreshold"
                    type="number"
                    className="h-11 border-slate-300/95 tabular-nums"
                    {...form.register("applicableSalaryThreshold", {
                      setValueAs: (v) => (v === "" ? null : Number(v)),
                    })}
                    min={0}
                    step={500}
                    placeholder={t("workerForm.applicableSalaryThresholdPlaceholder")}
                  />
                  <FieldErr msg={form.formState.errors.applicableSalaryThreshold?.message} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="workLocation">{t("workerForm.workLocation")}</Label>
                  <Input
                    id="workLocation"
                    list="worker-new-locations"
                    className="h-11 border-slate-300/95"
                    {...form.register("workLocation")}
                  />
                  <datalist id="worker-new-locations">
                    {WORK_LOCATION_OPTIONS.map((l) => (
                      <option key={l} value={l} />
                    ))}
                  </datalist>
                  <FieldErr msg={form.formState.errors.workLocation?.message} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>{t("workerForm.status")}</Label>
                  <Select
                    value={form.watch("employmentStatus")}
                    onValueChange={(v) =>
                      form.setValue(
                        "employmentStatus",
                        v as EmploymentStatus
                      )
                    }
                  >
                    <SelectTrigger className="h-11 border-slate-300/95">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {NEW_WORKER_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {t(`workerForm.status.${s}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldErr
                    msg={form.formState.errors.employmentStatus?.message}
                  />
                </div>
                <div className="flex flex-col gap-4 sm:col-span-2">
                  <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50/70 p-4">
                    <input
                      type="checkbox"
                      id="offshore"
                      className="mt-1 size-4 rounded border-slate-300 text-brand-navy focus:ring-brand-navy"
                      checked={Boolean(form.watch("isOffshoreWorker"))}
                      onChange={(e) =>
                        form.setValue("isOffshoreWorker", e.target.checked)
                      }
                    />
                    <div>
                      <Label htmlFor="offshore" className="cursor-pointer">
                        {t("workerForm.offshore")}
                      </Label>
                    </div>
                  </div>
                  {form.watch("isOffshoreWorker") ? (
                    <div className="space-y-1.5">
                      <Label htmlFor="vessel">{t("workerForm.vessel")}</Label>
                      <Input
                        id="vessel"
                        className="h-11 border-slate-300/95"
                        {...form.register("vesselName")}
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            </section>
          ) : null}

          {step === 3 ? (
            <section className="space-y-6" aria-labelledby="wf-sum">
              <div>
                <CardTitle id="wf-sum" className="text-lg text-brand-navy">
                  {t("workerForm.summaryTitle")}
                </CardTitle>
                <CardDescription className="mt-1">
                  {t("workerForm.summaryHint")}
                </CardDescription>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <SummaryBlock
                  title={t("workerForm.section.personal")}
                  rows={[
                    [t("workerForm.firstName"), form.watch("firstName")],
                    [t("workerForm.lastName"), form.watch("lastName")],
                    [t("workerForm.email"), form.watch("email")],
                    [t("workerForm.nationality"), form.watch("nationality")],
                    [t("workerForm.phone"), form.watch("phone") ?? "—"],
                    [
                      t("workerForm.dob"),
                      fmtDate(locale, form.watch("dateOfBirth")),
                    ],
                    [
                      t("workerForm.passport"),
                      form.watch("passportNumber") || "—",
                    ],
                    [t("workerForm.brp"), form.watch("brpNumber") || "—"],
                    [t("workerForm.currentAddress"), form.watch("currentAddress") || "—"],
                  ]}
                />
                <SummaryBlock
                  title={t("workerForm.section.visa")}
                  rows={[
                    [t("workerForm.visaType"), form.watch("visaType")],
                    [t("workerForm.cosRef"), form.watch("cosReference")],
                    [
                      t("workerForm.cosAssign"),
                      form.watch("cosAssignDate"),
                    ],
                    [
                      t("workerForm.cosExpiry"),
                      form.watch("cosExpiryDate"),
                    ],
                    [
                      t("workerForm.visaStart"),
                      fmtDate(locale, form.watch("visaStartDate")),
                    ],
                    [
                      t("workerForm.visaExpiry"),
                      fmtDate(locale, form.watch("visaExpiryDate")),
                    ],
                  ]}
                />
                <SummaryBlock
                  className="sm:col-span-2"
                  title={t("workerForm.section.job")}
                  rows={[
                    [t("workerForm.jobTitle"), form.watch("jobTitle")],
                    [t("workerForm.jobDescription"), form.watch("jobDescription") || "—"],
                    [t("workerForm.soc"), form.watch("occupationCode")],
                    [
                      t("workerForm.salary"),
                      `£${Number(form.watch("salary")).toLocaleString(locale === "tr" ? "tr-TR" : "en-GB")}`,
                    ],
                    [t("workerForm.workLocation"), form.watch("workLocation")],
                    [
                      t("workerForm.status"),
                      form.watch("employmentStatus")
                        ? t(
                            `workerForm.status.${form.watch("employmentStatus")}`
                          )
                        : "",
                    ],
                    [
                      t("workerForm.offshore"),
                      form.watch("isOffshoreWorker")
                        ? t("workerForm.booleanYes")
                        : t("workerForm.booleanNo"),
                    ],
                    [
                      t("workerForm.vessel"),
                      form.watch("vesselName") || "—",
                    ],
                  ]}
                />
              </div>
            </section>
          ) : null}

          {submitError ? (
            <p role="alert" className="text-sm font-medium text-red-700">
              {submitError}
            </p>
          ) : null}

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              variant="outline"
              className="border-slate-300"
              disabled={step === 0}
              onClick={() => setStep((s) => Math.max(0, s - 1))}
            >
              <ChevronLeft className="mr-1 h-4 w-4" aria-hidden />
              {t("workerForm.back")}
            </Button>
            <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-end">
              <Button variant="secondary" type="button" className="sm:inline-flex" asChild>
                <Link href="/workers">{t("workerForm.backList")}</Link>
              </Button>
              {step < STEP_COUNT - 1 ? (
                <Button type="button" className="sm:min-w-[8rem]" onClick={() => void goNext()}>
                  {t("workerForm.next")}
                  <ChevronRight className="ml-1 h-4 w-4" aria-hidden />
                </Button>
              ) : (
                <Button
                  type="submit"
                  size="lg"
                  disabled={saving}
                  className="min-h-12 px-10 text-base font-semibold shadow-md"
                >
                  {saving ? t("workerForm.saving") : t("workerForm.save")}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}

function FieldErr({ msg }: { msg?: string }): JSX.Element | null {
  if (!msg) return null;
  return <p className="text-xs font-medium text-red-700">{msg}</p>;
}

function SummaryBlock(props: {
  title: string;
  rows: [string, string][];
  className?: string;
}): JSX.Element {
  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200/90 bg-brand-surface/60 p-4 shadow-sm sm:p-5",
        props.className
      )}
    >
      <p className="border-b border-slate-100 pb-3 text-xs font-bold uppercase tracking-wide text-slate-500">
        {props.title}
      </p>
      <dl className="mt-4 space-y-3 text-sm">
        {props.rows.map(([label, val]) => (
          <div key={label}>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              {label}
            </dt>
            <dd className="mt-0.5 break-words font-medium leading-snug text-slate-900">
              {val || "—"}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function fmtDate(
  locale: "tr" | "en",
  v: string | null | undefined
): string {
  if (!v) return "—";
  const tag = locale === "tr" ? "tr-TR" : "en-GB";
  const d = new Date(`${v}T12:00:00`);
  if (Number.isNaN(d.getTime())) return v;
  return d.toLocaleDateString(tag);
}
