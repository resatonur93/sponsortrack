"use client";

import { useCallback, useEffect, useState } from "react";
import type { SalaryRecord } from "@prisma/client";
import { Plus, Trash2 } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "@/contexts/LanguageContext";

type SalaryDeductionCategory =
  | "ACCOMMODATION"
  | "UNIFORM"
  | "TRAINING"
  | "RECRUITMENT_FEE"
  | "OTHER";
type SalaryDeductionItem = { label: string; amount: number; category: SalaryDeductionCategory };
const DISALLOWED_CATEGORIES: SalaryDeductionCategory[] = [
  "ACCOMMODATION",
  "UNIFORM",
  "TRAINING",
  "RECRUITMENT_FEE",
];
const DEDUCTION_CATEGORIES: SalaryDeductionCategory[] = [
  "ACCOMMODATION",
  "UNIFORM",
  "TRAINING",
  "RECRUITMENT_FEE",
  "OTHER",
];

type EnrichedRecord = SalaryRecord & {
  expectedForPeriod: number;
  overlapsUnpaidLeave: boolean;
  expectedForPeriodAdjustedForLeave: number | null;
  underpaidBeyondLeave: boolean;
};

type ApiGet = {
  records: EnrichedRecord[];
  cosAnnualSalaryGbp: number;
  contractedHoursPerWeek: number | null;
  applicableSalaryThreshold: number | null;
};

function recordDeductions(r: EnrichedRecord): SalaryDeductionItem[] {
  if (!Array.isArray(r.deductions)) return [];
  return (r.deductions as unknown[]).filter(
    (item): item is SalaryDeductionItem =>
      !!item &&
      typeof item === "object" &&
      typeof (item as SalaryDeductionItem).label === "string" &&
      typeof (item as SalaryDeductionItem).amount === "number" &&
      typeof (item as SalaryDeductionItem).category === "string"
  );
}

function hasDisallowedDeduction(items: SalaryDeductionItem[]): boolean {
  return items.some((d) => DISALLOWED_CATEGORIES.includes(d.category) && d.amount > 0);
}

export function SalaryVerificationCard({
  workerId,
}: {
  workerId: string;
}): JSX.Element {
  const { t, locale } = useTranslation();
  const dateTag = locale === "tr" ? "tr-TR" : "en-GB";
  const [data, setData] = useState<ApiGet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [actualPaid, setActualPaid] = useState("");
  const [hoursWorked, setHoursWorked] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [deductionRows, setDeductionRows] = useState<SalaryDeductionItem[]>([]);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/workers/${workerId}/salary-records?months=12`,
        { credentials: "include" }
      );
      if (!res.ok) {
        setError(t("workerDetail.salary.loadError"));
        return;
      }
      const json = (await res.json()) as { data: ApiGet };
      setData(json.data);
    } finally {
      setLoading(false);
    }
  }, [workerId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const chartRows =
    data?.records.map((r, idx) => ({
      key: `${r.id}-${idx}`,
      label: new Date(r.periodEnd).toLocaleDateString(dateTag, {
        month: "short",
        year: "2-digit",
      }),
      expected: r.expectedForPeriod,
      actual: r.actualPaid,
    })) ?? [];

  const anomalies = data?.records.filter((r) => !r.isCompliant) ?? [];

  function addDeductionRow(): void {
    setDeductionRows((rows) => [...rows, { label: "", amount: 0, category: "OTHER" }]);
  }
  function removeDeductionRow(idx: number): void {
    setDeductionRows((rows) => rows.filter((_, i) => i !== idx));
  }
  function updateDeductionRow(idx: number, patch: Partial<SalaryDeductionItem>): void {
    setDeductionRows((rows) =>
      rows.map((row, i) => (i === idx ? { ...row, ...patch } : row))
    );
  }

  async function submitManual(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    const a = parseInt(actualPaid.replace(/\D/g, ""), 10);
    if (!periodStart || !periodEnd || Number.isNaN(a)) {
      setError(t("workerDetail.salary.fillError"));
      return;
    }
    const h = hoursWorked.trim() ? parseInt(hoursWorked.replace(/\D/g, ""), 10) : undefined;
    const validDeductions = deductionRows.filter((d) => d.label.trim() && d.amount > 0);
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/workers/${workerId}/salary-records`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          periodStart,
          periodEnd,
          actualPaid: a,
          hoursWorked: Number.isNaN(h) ? undefined : h,
          evidenceUrl: evidenceUrl.trim() || undefined,
          deductions: validDeductions.length > 0 ? validDeductions : undefined,
        }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setError(j.error ?? "Save failed");
        return;
      }
      setPeriodStart("");
      setPeriodEnd("");
      setActualPaid("");
      setHoursWorked("");
      setEvidenceUrl("");
      setDeductionRows([]);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function onCsvSelected(file: File | null): Promise<void> {
    if (!file) return;
    const text = await file.text();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/workers/${workerId}/salary-records`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: text }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setError(j.error ?? "CSV upload failed");
        return;
      }
      await load();
    } finally {
      setSaving(false);
    }
  }

  if (loading && !data) {
    return (
      <Card className="border-slate-200/90 shadow-sm">
        <CardContent className="py-8 text-sm text-slate-600">
          {t("workerDetail.salary.loading")}
        </CardContent>
      </Card>
    );
  }

  const cosAmountFormatted =
    data?.cosAnnualSalaryGbp !== undefined && data.cosAnnualSalaryGbp !== null
      ? `£${data.cosAnnualSalaryGbp.toLocaleString(dateTag)}`
      : "—";

  return (
    <Card className="border-slate-200/90 shadow-md">
      <CardHeader className="space-y-2 border-b border-slate-100 bg-slate-50/50 pb-4">
        <CardTitle className="text-lg font-semibold text-brand-navy">
          {t("workerDetail.salary.title")}
        </CardTitle>
        <p className="text-xs leading-relaxed text-slate-600">
          {t("workerDetail.salary.subtitle").replace("{amount}", cosAmountFormatted)}
        </p>
        {error ? (
          <p className="text-sm text-red-700">{error}</p>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-8 pt-6">
        {chartRows.length > 0 ? (
          <div className="h-64 w-full rounded-xl border border-brand-navy/12 bg-brand-surface/80 p-3 shadow-inner">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {t("workerDetail.salary.chartTitle")}
            </p>
            <ResponsiveContainer width="100%" height="85%">
              <BarChart data={chartRows} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fill: "#64748b", fontSize: 11 }} />
                <YAxis tick={{ fill: "#64748b", fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar
                  dataKey="expected"
                  name="Pro-rated expected"
                  fill="#0A2A5E"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="actual"
                  name="Actual paid"
                  fill="#0D9488"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50/60 px-3 py-4 text-sm text-slate-600">
            {t("workerDetail.salary.noData")}
          </p>
        )}

        {anomalies.length > 0 ? (
          <div className="space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
              {t("workerDetail.salary.anomaliesTitle")}
            </p>
            <ul className="space-y-2">
              {anomalies.map((r) => (
                <li
                  key={r.id}
                  className="flex flex-wrap items-start justify-between gap-2 rounded-md border border-red-100 bg-red-50/80 px-3 py-2 text-sm"
                >
                  <div>
                    <Badge variant="danger" className="mb-1">
                      {t("workerDetail.salary.anomalyBadge")}
                    </Badge>
                    <p className="text-slate-800">
                      {new Date(r.periodStart).toLocaleDateString(dateTag)} –{" "}
                      {new Date(r.periodEnd).toLocaleDateString(dateTag)}
                      {": "}
                      £{r.actualPaid.toLocaleString(dateTag)}, ~£
                      {r.expectedForPeriod.toLocaleString(dateTag)}
                    </p>
                    {r.discrepancyReason ? (
                      <p className="mt-1 text-xs text-red-900">
                        {r.discrepancyReason}
                      </p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {data?.records.some(
          (r) =>
            r.belowCosThreshold ||
            r.hoursDiscrepancy ||
            r.belowApplicableThreshold ||
            !r.evidenceUrl ||
            r.overlapsUnpaidLeave ||
            r.underpaidBeyondLeave ||
            hasDisallowedDeduction(recordDeductions(r))
        ) ? (
          <div className="space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
              {t("workerDetail.salary.flagsTitle")}
            </p>
            <ul className="space-y-2">
              {data!.records.map((r) => {
                const deductions = recordDeductions(r);
                const flags: string[] = [];
                if (r.belowCosThreshold) flags.push(t("workerDetail.salary.flagBelowCos"));
                if (r.hoursDiscrepancy) flags.push(t("workerDetail.salary.flagHours"));
                if (r.belowApplicableThreshold)
                  flags.push(t("workerDetail.salary.flagBelowApplicableThreshold"));
                if (!r.evidenceUrl) flags.push(t("workerDetail.salary.flagEvidence"));
                if (r.overlapsUnpaidLeave && !r.underpaidBeyondLeave)
                  flags.push(t("workerDetail.salary.flagUnpaidLeave"));
                if (r.underpaidBeyondLeave)
                  flags.push(t("workerDetail.salary.flagUnderpaidBeyondLeave"));
                if (hasDisallowedDeduction(deductions))
                  flags.push(t("workerDetail.salary.flagDeduction"));
                if (flags.length === 0) return null;
                return (
                  <li
                    key={`flags-${r.id}`}
                    className="flex flex-wrap items-start justify-between gap-2 rounded-md border border-amber-200 bg-amber-50/80 px-3 py-2 text-sm"
                  >
                    <div className="space-y-1">
                      <p className="text-slate-800">
                        {new Date(r.periodStart).toLocaleDateString(dateTag)} –{" "}
                        {new Date(r.periodEnd).toLocaleDateString(dateTag)}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {flags.map((f) => (
                          <Badge key={f} variant="warning" className="text-[11px]">
                            {f}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        <div className="grid gap-6 border-t border-slate-100 pt-6 md:grid-cols-2">
          <form
            className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            onSubmit={(e) => void submitManual(e)}
          >
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
              {t("workerDetail.salary.manualEntry")}
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs">{t("workerDetail.salary.periodStart")}</Label>
                <Input
                  type="date"
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t("workerDetail.salary.periodEnd")}</Label>
                <Input
                  type="date"
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("workerDetail.salary.actualPaid")}</Label>
              <p className="text-[11px] text-slate-500">
                {t("workerDetail.salary.contractedFromProfile").replace("{amount}", cosAmountFormatted)}
              </p>
              <Input
                inputMode="numeric"
                value={actualPaid}
                onChange={(e) => setActualPaid(e.target.value)}
                placeholder="e.g. 2800"
                required
              />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs">{t("workerDetail.salary.hoursWorked")}</Label>
                <Input
                  inputMode="numeric"
                  value={hoursWorked}
                  onChange={(e) => setHoursWorked(e.target.value)}
                  placeholder="e.g. 160"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t("workerDetail.salary.evidenceUrl")}</Label>
                <Input
                  value={evidenceUrl}
                  onChange={(e) => setEvidenceUrl(e.target.value)}
                  placeholder="https://…"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">{t("workerDetail.salary.deductions")}</Label>
                <Button type="button" size="sm" variant="outline" onClick={addDeductionRow} className="h-7 gap-1 px-2 text-xs">
                  <Plus className="h-3 w-3" aria-hidden />
                  {t("workerDetail.salary.addDeduction")}
                </Button>
              </div>
              {deductionRows.length === 0 ? (
                <p className="text-xs text-slate-500">{t("workerDetail.salary.noDeductions")}</p>
              ) : (
                <div className="space-y-2">
                  {deductionRows.map((row, idx) => (
                    <div key={idx} className="flex flex-wrap items-center gap-2">
                      <Input
                        value={row.label}
                        onChange={(e) => updateDeductionRow(idx, { label: e.target.value })}
                        placeholder={t("workerDetail.salary.deductionLabel")}
                        className="h-8 min-w-[8rem] flex-1 text-xs"
                      />
                      <Input
                        inputMode="numeric"
                        value={row.amount || ""}
                        onChange={(e) =>
                          updateDeductionRow(idx, {
                            amount: parseInt(e.target.value.replace(/\D/g, ""), 10) || 0,
                          })
                        }
                        placeholder="£"
                        className="h-8 w-20 text-xs"
                      />
                      <Select
                        value={row.category}
                        onValueChange={(v) =>
                          updateDeductionRow(idx, { category: v as SalaryDeductionCategory })
                        }
                      >
                        <SelectTrigger className="h-8 w-40 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DEDUCTION_CATEGORIES.map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {t(`salaryDeduction.category.${cat}`)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => removeDeductionRow(idx)}
                        className="h-8 w-8 shrink-0 p-0"
                        aria-label={t("common.delete")}
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Button type="submit" size="sm" disabled={saving}>
              {saving ? t("workerDetail.saving") : t("workerDetail.salary.addRecord")}
            </Button>
          </form>

          <div className="space-y-3 rounded-xl border border-dashed border-brand-navy/20 bg-brand-surface/50 p-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-brand-navy">
              {t("workerDetail.salary.csvUpload")}
            </p>
            <p className="text-xs leading-relaxed text-slate-600">
              {t("workerDetail.salary.csvHint")}
            </p>
            <Input
              type="file"
              accept=".csv,text/csv"
              disabled={saving}
              onChange={(e) => void onCsvSelected(e.target.files?.[0] ?? null)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
