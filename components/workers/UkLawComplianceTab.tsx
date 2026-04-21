"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SerializedUkLawCheck } from "@/lib/uk-law-check-utils";
import {
  assessNmwFromAnnualSalary,
  DEFAULT_NLW_HOURLY_GBP,
} from "@/lib/uk-law-nmw";

type Props = {
  workerId: string;
  defaultAnnualSalary: number;
};

export function UkLawComplianceTab(props: Props): JSX.Element {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [check, setCheck] = useState<SerializedUkLawCheck | null>(null);

  const [nmwCompliant, setNmwCompliant] = useState<string>("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [hoursPerWeek, setHoursPerWeek] = useState("");
  const [weeklyHours, setWeeklyHours] = useState("");
  const [maxWeeklyHours, setMaxWeeklyHours] = useState("48");
  const [optOutSigned, setOptOutSigned] = useState(false);
  const [annualEntitlement, setAnnualEntitlement] = useState("28");
  const [daysTaken, setDaysTaken] = useState("");
  const [daysRemaining, setDaysRemaining] = useState("");
  const [contractIssued, setContractIssued] = useState("");
  const [contractType, setContractType] = useState("permanent");
  const [flagsText, setFlagsText] = useState("");

  const [calcSalary, setCalcSalary] = useState(String(props.defaultAnnualSalary));
  const [calcHours, setCalcHours] = useState("37.5");
  const [calcNmwRef, setCalcNmwRef] = useState(String(DEFAULT_NLW_HOURLY_GBP));

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    const res = await fetch(`/api/workers/${props.workerId}/uk-law-checks`, {
      credentials: "include",
      cache: "no-store",
    });
    setLoading(false);
    if (!res.ok) return;
    const json = (await res.json()) as { data: SerializedUkLawCheck | null };
    const row = json.data;
    setCheck(row);
    if (row) {
      setNmwCompliant(
        row.nmwCompliant === null ? "" : row.nmwCompliant ? "yes" : "no"
      );
      setHourlyRate(row.hourlyRate ?? "");
      setHoursPerWeek(row.hoursPerWeek ?? "");
      setWeeklyHours(row.weeklyHours ?? "");
      setMaxWeeklyHours(row.maxWeeklyHours);
      setOptOutSigned(row.optOutSigned);
      setAnnualEntitlement(row.annualEntitlement);
      setDaysTaken(row.daysTaken ?? "");
      setDaysRemaining(row.daysRemaining ?? "");
      setContractIssued(
        row.contractIssued ? row.contractIssued.slice(0, 10) : ""
      );
      setContractType(row.contractType);
      setFlagsText(row.flags.join("\n"));
    } else {
      setNmwCompliant("");
      setHourlyRate("");
      setHoursPerWeek("");
      setWeeklyHours("");
      setMaxWeeklyHours("48");
      setOptOutSigned(false);
      setAnnualEntitlement("28");
      setDaysTaken("");
      setDaysRemaining("");
      setContractIssued("");
      setContractType("permanent");
      setFlagsText("");
    }
  }, [props.workerId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setCalcSalary(String(props.defaultAnnualSalary));
  }, [props.defaultAnnualSalary]);

  async function save(): Promise<void> {
    setSaving(true);
    const flags = flagsText
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const body: Record<string, unknown> = {
      optOutSigned,
      contractType,
      flags,
      maxWeeklyHours: maxWeeklyHours.trim() || undefined,
      annualEntitlement: annualEntitlement.trim() || undefined,
    };
    if (nmwCompliant === "yes") body.nmwCompliant = true;
    else if (nmwCompliant === "no") body.nmwCompliant = false;
    else body.nmwCompliant = null;
    if (hourlyRate.trim()) body.hourlyRate = hourlyRate.trim();
    else body.hourlyRate = null;
    if (hoursPerWeek.trim()) body.hoursPerWeek = hoursPerWeek.trim();
    else body.hoursPerWeek = null;
    if (weeklyHours.trim()) body.weeklyHours = weeklyHours.trim();
    else body.weeklyHours = null;
    if (daysTaken.trim()) body.daysTaken = daysTaken.trim();
    else body.daysTaken = null;
    if (daysRemaining.trim()) body.daysRemaining = daysRemaining.trim();
    else body.daysRemaining = null;
    if (contractIssued.trim()) body.contractIssued = contractIssued.trim();
    else body.contractIssued = null;

    const res = await fetch(`/api/workers/${props.workerId}/uk-law-checks`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      alert(j.error ?? "Save failed");
      return;
    }
    await load();
  }

  const nmwRef = Number(calcNmwRef);
  const salaryN = Number(calcSalary);
  const hoursN = Number(calcHours);
  const nmwResult =
    Number.isFinite(nmwRef) && Number.isFinite(salaryN) && Number.isFinite(hoursN)
      ? assessNmwFromAnnualSalary(salaryN, hoursN, nmwRef)
      : null;

  if (loading) {
    return <p className="text-sm text-slate-600">Loading UK Law check…</p>;
  }

  return (
    <div className="space-y-6">
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-base">NMW / NLW quick check</CardTitle>
          <p className="text-sm text-slate-600">
            Annual salary ÷ (hours × 52) vs reference NLW (£
            {DEFAULT_NLW_HOURLY_GBP}/h default — update rate as needed).
          </p>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <Label>Annual salary (GBP)</Label>
            <Input
              type="number"
              step="1"
              value={calcSalary}
              onChange={(e) => setCalcSalary(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Hours per week</Label>
            <Input
              type="number"
              step="0.25"
              value={calcHours}
              onChange={(e) => setCalcHours(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Reference NLW (£/h)</Label>
            <Input
              type="number"
              step="0.01"
              value={calcNmwRef}
              onChange={(e) => setCalcNmwRef(e.target.value)}
            />
          </div>
          {nmwResult && !Number.isNaN(nmwResult.impliedHourly) ? (
            <div className="sm:col-span-3 rounded-md border border-slate-100 bg-slate-50 p-3 text-sm">
              <p>
                <span className="text-slate-600">Implied hourly rate:</span>{" "}
                <strong>£{nmwResult.impliedHourly.toFixed(2)}</strong>
              </p>
              <p className="mt-1">
                <span className="text-slate-600">vs reference:</span> £
                {nmwResult.referenceNlwHourlyGbp.toFixed(2)}/h —{" "}
                <Badge variant={nmwResult.compliant ? "success" : "danger"}>
                  {nmwResult.compliant ? "Compliant (≥ reference)" : "Below reference"}
                </Badge>
              </p>
            </div>
          ) : (
            <p className="sm:col-span-3 text-sm text-slate-500">
              Enter valid numbers to see the check.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="border-brand-navy/20">
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">UK employment law record</CardTitle>
            <p className="text-sm text-slate-600">
              NMW, working time, holiday and contract flags for this worker.
            </p>
          </div>
          {check?.flags?.length ? (
            <div className="flex flex-wrap gap-1">
              {check.flags.map((f) => (
                <Badge key={f} variant="danger" className="text-xs">
                  {f}
                </Badge>
              ))}
            </div>
          ) : null}
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <Label>NMW compliant</Label>
            <Select value={nmwCompliant || "unset"} onValueChange={(v) => setNmwCompliant(v === "unset" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Not set" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unset">Not set</SelectItem>
                <SelectItem value="yes">Yes</SelectItem>
                <SelectItem value="no">No</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Hourly rate (£)</Label>
            <Input
              value={hourlyRate}
              onChange={(e) => setHourlyRate(e.target.value)}
              placeholder="e.g. 12.50"
            />
          </div>
          <div className="space-y-1">
            <Label>Contracted hours / week</Label>
            <Input
              value={hoursPerWeek}
              onChange={(e) => setHoursPerWeek(e.target.value)}
              placeholder="e.g. 37.5"
            />
          </div>
          <div className="space-y-1">
            <Label>Actual weekly hours</Label>
            <Input
              value={weeklyHours}
              onChange={(e) => setWeeklyHours(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Max weekly hours (cap)</Label>
            <Input
              value={maxWeeklyHours}
              onChange={(e) => setMaxWeeklyHours(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 pt-6">
            <input
              type="checkbox"
              id="optOut"
              checked={optOutSigned}
              onChange={(e) => setOptOutSigned(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300"
            />
            <Label htmlFor="optOut" className="font-normal">
              Working Time Regulations opt-out signed
            </Label>
          </div>
          <div className="space-y-1">
            <Label>Annual holiday entitlement (days)</Label>
            <Input
              value={annualEntitlement}
              onChange={(e) => setAnnualEntitlement(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Days taken</Label>
            <Input
              value={daysTaken}
              onChange={(e) => setDaysTaken(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Days remaining</Label>
            <Input
              value={daysRemaining}
              onChange={(e) => setDaysRemaining(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Contract issued</Label>
            <Input
              type="date"
              value={contractIssued}
              onChange={(e) => setContractIssued(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Contract type</Label>
            <Select value={contractType} onValueChange={setContractType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="permanent">permanent</SelectItem>
                <SelectItem value="fixed-term">fixed-term</SelectItem>
                <SelectItem value="zero-hours">zero-hours</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label>Flags (one per line or comma-separated)</Label>
            <textarea
              className="min-h-[88px] w-full rounded-md border border-slate-300 p-2 font-mono text-xs"
              value={flagsText}
              onChange={(e) => setFlagsText(e.target.value)}
              placeholder={"nmw_risk\nhours_exceeded\nno_contract"}
            />
            <p className="text-xs text-slate-500">
              Stored as badges; use for risk tagging and anomaly reports.
            </p>
          </div>
          {check ? (
            <p className="text-xs text-slate-500 md:col-span-2">
              Last updated: {new Date(check.updatedAt).toLocaleString("en-GB")}
            </p>
          ) : null}
          <div className="md:col-span-2">
            <Button type="button" disabled={saving} onClick={() => void save()}>
              {saving ? "Saving…" : "Save UK Law check"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
