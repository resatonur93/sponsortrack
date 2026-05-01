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
        setError("Could not load salary records");
        return;
      }
      const json = (await res.json()) as { data: ApiGet };
      setData(json.data);
    } finally {
      setLoading(false);
    }
  }, [workerId]);

  useEffect(() => {
    void load();
  }, [load]);

  const chartRows =
    data?.records.map((r, idx) => ({
      key: `${r.id}-${idx}`,
      label: new Date(r.periodEnd).toLocaleDateString("en-GB", {
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
      setError("Fill period and numeric salaries");
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
      <Card className="border-slate-200">
        <CardContent className="py-6 text-sm text-slate-600">
          Loading salary verification…
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-slate-200">
      <CardHeader className="space-y-1 pb-2">
        <CardTitle className="text-base">Salary verification</CardTitle>
        <p className="text-xs text-slate-600">
          CoS annual (worker record):{" "}
          <span className="font-semibold text-slate-800">
            £{data?.cosAnnualSalaryGbp?.toLocaleString("en-GB") ?? "—"}
          </span>{" "}
          · Compares pro-rated expectation per period to actual paid (tolerance
          £100).
        </p>
        {error ? (
          <p className="text-sm text-red-700">{error}</p>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-6">
        {chartRows.length > 0 ? (
          <div className="h-64 w-full rounded-lg border border-brand-navy/12 bg-brand-surface/70 p-2">
            <p className="mb-2 text-xs font-medium text-slate-600">
              Last 12 months — pro-rated expected vs actual paid
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
          <p className="text-sm text-slate-500">
            No salary periods in the last 12 months. Add a record below or
            upload CSV.
          </p>
        )}

        {anomalies.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase text-slate-500">
              Anomalies (this worker)
            </p>
            <ul className="space-y-2">
              {anomalies.map((r) => (
                <li
                  key={r.id}
                  className="flex flex-wrap items-start justify-between gap-2 rounded-md border border-red-100 bg-red-50/80 px-3 py-2 text-sm"
                >
                  <div>
                    <Badge variant="danger" className="mb-1">
                      Underpayment / mismatch
                    </Badge>
                    <p className="text-slate-800">
                      {new Date(r.periodStart).toLocaleDateString("en-GB")} –{" "}
                      {new Date(r.periodEnd).toLocaleDateString("en-GB")}: paid
                      £{r.actualPaid.toLocaleString("en-GB")}, expected ~£
                      {r.expectedForPeriod.toLocaleString("en-GB")}
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

        <div className="grid gap-4 border-t border-slate-100 pt-4 md:grid-cols-2">
          <form className="space-y-3" onSubmit={(e) => void submitManual(e)}>
            <p className="text-xs font-semibold uppercase text-slate-500">
              Manual entry
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs">Period start</Label>
                <Input
                  type="date"
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Period end</Label>
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
                <Label className="text-xs">CoS annual (£)</Label>
                <Input
                  inputMode="numeric"
                  value={contractedSalary}
                  onChange={(e) => setContractedSalary(e.target.value)}
                  placeholder="e.g. 36000"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Actual paid (£)</Label>
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
              {saving ? "Saving…" : "Add record"}
            </Button>
          </form>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase text-slate-500">
              CSV upload
            </p>
            <p className="text-xs text-slate-600">
              Columns: periodStart, periodEnd, contractedSalary, actualPaid
              [, currency, hoursWorked, overtime, evidenceUrl]. Header row
              optional.
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
