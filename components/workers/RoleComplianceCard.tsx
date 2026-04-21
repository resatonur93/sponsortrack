"use client";

import { useCallback, useEffect, useState } from "react";
import type { RoleCompliance } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

const FLAG_LABELS: Record<string, string> = {
  duty_drift: "Duty drift",
  title_mismatch: "Title mismatch",
  code_risk: "SOC / code risk",
};

type ApiPayload = {
  roleCompliance: RoleCompliance;
  workerContext: { jobTitle: string; occupationCode: string };
};

export function RoleComplianceCard({
  workerId,
}: {
  workerId: string;
}): JSX.Element {
  const [payload, setPayload] = useState<ApiPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cosJobDescription, setCosJobDescription] = useState("");
  const [cosOccupationCode, setCosOccupationCode] = useState("");
  const [contractDuties, setContractDuties] = useState("");
  const [internalJobDesc, setInternalJobDesc] = useState("");
  const [actualDuties, setActualDuties] = useState("");
  const [saving, setSaving] = useState(false);
  const [reviewing, setReviewing] = useState(false);

  const hydrate = useCallback((p: ApiPayload): void => {
    setPayload(p);
    const rc = p.roleCompliance;
    setCosJobDescription(rc.cosJobDescription);
    setCosOccupationCode(rc.cosOccupationCode);
    setContractDuties(rc.contractDuties);
    setInternalJobDesc(rc.internalJobDesc ?? "");
    setActualDuties(rc.actualDuties ?? "");
  }, []);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/workers/${workerId}/role-compliance`, {
        credentials: "include",
      });
      if (!res.ok) {
        setError("Could not load role compliance");
        return;
      }
      const json = (await res.json()) as { data: ApiPayload };
      hydrate(json.data);
    } finally {
      setLoading(false);
    }
  }, [workerId, hydrate]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(): Promise<void> {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/workers/${workerId}/role-compliance`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cosJobDescription,
          cosOccupationCode,
          contractDuties,
          internalJobDesc: internalJobDesc || null,
          actualDuties: actualDuties || null,
        }),
      });
      if (!res.ok) {
        setError("Save failed");
        return;
      }
      const json = (await res.json()) as { data: ApiPayload };
      hydrate(json.data);
    } finally {
      setSaving(false);
    }
  }

  async function recordReview(): Promise<void> {
    setReviewing(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/workers/${workerId}/role-compliance/review`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            actualDuties: actualDuties || null,
            internalJobDesc: internalJobDesc || null,
          }),
        }
      );
      if (!res.ok) {
        setError("Review failed");
        return;
      }
      const json = (await res.json()) as { data: ApiPayload };
      hydrate(json.data);
    } finally {
      setReviewing(false);
    }
  }

  if (loading && !payload) {
    return (
      <Card className="border-slate-200">
        <CardContent className="py-6 text-sm text-slate-600">
          Loading role compliance…
        </CardContent>
      </Card>
    );
  }

  if (!payload) {
    return (
      <Card className="border-red-200 bg-red-50/50">
        <CardContent className="py-4 text-sm text-red-800">
          {error ?? "Unavailable"}
        </CardContent>
      </Card>
    );
  }

  const { roleCompliance: rc, workerContext } = payload;
  const flags = rc.mismatchFlags ?? [];

  return (
    <Card className="border-slate-200">
      <CardHeader className="space-y-2 pb-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <CardTitle className="text-base">Role compliance</CardTitle>
          <div className="flex flex-wrap gap-1">
            {flags.length === 0 ? (
              <Badge variant="success">Aligned</Badge>
            ) : (
              flags.map((f) => (
                <Badge key={f} variant="danger">
                  {FLAG_LABELS[f] ?? f}
                </Badge>
              ))
            )}
          </div>
        </div>
        <p className="text-xs text-slate-600">
          Worker record:{" "}
          <span className="font-medium text-slate-800">
            {workerContext.jobTitle}
          </span>{" "}
          · SOC{" "}
          <span className="font-mono text-slate-800">
            {workerContext.occupationCode}
          </span>
        </p>
        {rc.needsChangeOfEmployment ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
            <strong>Change of employment may be required</strong> — CoS job
            description, contract duties, or SOC do not match the role as
            recorded or actual duties.
          </div>
        ) : null}
        {error ? (
          <p className="text-sm text-red-700">{error}</p>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs font-semibold uppercase text-slate-500">
                CoS
              </Label>
              <Badge variant="outline" className="font-mono text-[10px]">
                {cosOccupationCode}
              </Badge>
            </div>
            <textarea
              className="min-h-[160px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
              value={cosJobDescription}
              onChange={(e) => setCosJobDescription(e.target.value)}
              aria-label="CoS job description"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase text-slate-500">
              Contract
            </Label>
            <textarea
              className="min-h-[160px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
              value={contractDuties}
              onChange={(e) => setContractDuties(e.target.value)}
              aria-label="Contract duties"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase text-slate-500">
              Actual duties
            </Label>
            <textarea
              className="min-h-[160px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
              value={actualDuties}
              onChange={(e) => setActualDuties(e.target.value)}
              aria-label="Actual day-to-day duties"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase text-slate-500">
            Internal job description (optional)
          </Label>
          <textarea
            className="min-h-[72px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
            value={internalJobDesc}
            onChange={(e) => setInternalJobDesc(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
          <span>
            Last reviewed:{" "}
            {rc.lastReviewed
              ? new Date(rc.lastReviewed).toLocaleString("en-GB")
              : "—"}
          </span>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={reviewing || saving}
              onClick={() => void recordReview()}
            >
              {reviewing ? "Recording…" : "Record review"}
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={saving || reviewing}
              onClick={() => void save()}
            >
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
