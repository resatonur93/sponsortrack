"use client";

import { useCallback, useEffect, useState } from "react";
import type { SalaryRecord } from "@prisma/client";
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
import { useTranslation } from "@/contexts/LanguageContext";

type EnrichedRecord = SalaryRecord & { expectedForPeriod: number };

type ApiGet = {
  records: EnrichedRecord[];
  cosAnnualSalaryGbp: number;
};

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
  const [contractedSalary, setContractedSalary] = useState("");
  const [actualPaid, setActualPaid] = useState("");

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

  async function submitManual(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    const c = parseInt(contractedSalary.replace(/\D/g, ""), 10);
    const a = parseInt(actualPaid.replace(/\D/g, ""), 10);
    if (!periodStart || !periodEnd || Number.isNaN(c) || Number.isNaN(a)) {
      setError(t("workerDetail.salary.fillError"));
      return;
    }
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
          contractedSalary: c,
          actualPaid: a,
        }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setError(j.error ?? "Save failed");
        return;
      }
      setPeriodStart("");
      setPeriodEnd("");
      setContractedSalary("");
      setActualPaid("");
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
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs">{t("workerDetail.salary.contractedAnnual")}</Label>
                <Input
                  inputMode="numeric"
                  value={contractedSalary}
                  onChange={(e) => setContractedSalary(e.target.value)}
                  placeholder="e.g. 36000"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t("workerDetail.salary.actualPaid")}</Label>
                <Input
                  inputMode="numeric"
                  value={actualPaid}
                  onChange={(e) => setActualPaid(e.target.value)}
                  placeholder="e.g. 2800"
                  required
                />
              </div>
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
