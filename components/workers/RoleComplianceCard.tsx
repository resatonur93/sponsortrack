"use client";

import { useCallback, useEffect, useState } from "react";
import type { RoleCompliance } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useTranslation } from "@/contexts/LanguageContext";

type ApiPayload = {
  roleCompliance: RoleCompliance;
  workerContext: { jobTitle: string; occupationCode: string };
};

export function RoleComplianceCard({
  workerId,
}: {
  workerId: string;
}): JSX.Element {
  const { t, locale } = useTranslation();
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
        setError(t("workerDetail.rc.loadError"));
        return;
      }
      const json = (await res.json()) as { data: ApiPayload };
      hydrate(json.data);
    } finally {
      setLoading(false);
    }
  }, [workerId, hydrate, t]);

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
        setError(t("workerDetail.rc.saveFailed"));
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
        setError(t("workerDetail.rc.reviewFailed"));
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
      <Card className="border-slate-200/90 shadow-sm">
        <CardContent className="py-8 text-sm text-slate-600">
          {t("workerDetail.rc.loading")}
        </CardContent>
      </Card>
    );
  }

  if (!payload) {
    return (
      <Card className="border-red-200 bg-red-50/50 shadow-sm">
        <CardContent className="py-4 text-sm text-red-800">
          {error ?? t("workerDetail.rc.loadError")}
        </CardContent>
      </Card>
    );
  }

  const { roleCompliance: rc, workerContext } = payload;
  const flags = rc.mismatchFlags ?? [];

  function flagLabel(f: string): string {
    return t(`workerDetail.rc.flag.${f}`, f);
  }

  return (
    <Card className="border-slate-200/90 shadow-md">
      <CardHeader className="space-y-3 border-b border-slate-100 bg-slate-50/60 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <CardTitle className="text-lg font-semibold text-brand-navy">
            {t("workerDetail.rc.title")}
          </CardTitle>
          <div className="flex flex-wrap gap-1.5">
            {flags.length === 0 ? (
              <Badge variant="success" className="px-2.5">
                {t("workerDetail.rc.aligned")}
              </Badge>
            ) : (
              flags.map((f) => (
                <Badge key={f} variant="danger" className="px-2.5">
                  {flagLabel(f)}
                </Badge>
              ))
            )}
          </div>
        </div>
        <p className="text-xs text-slate-600">
          {t("workerDetail.rc.workerRecord")}:{" "}
          <span className="font-medium text-slate-900">
            {workerContext.jobTitle}
          </span>{" "}
          · SOC{" "}
          <span className="font-mono text-sm text-slate-900">
            {workerContext.occupationCode}
          </span>
        </p>
        {rc.needsChangeOfEmployment ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-900">
            {t("workerDetail.rc.coeWarning")}
          </div>
        ) : null}
        {error ? (
          <p className="text-sm text-red-700">{error}</p>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-5 pt-6">
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-2 rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                {t("workerDetail.rc.cos")}
              </Label>
              <Badge variant="outline" className="font-mono text-[10px]">
                {cosOccupationCode}
              </Badge>
            </div>
            <textarea
              className="min-h-[160px] w-full rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2.5 text-sm leading-relaxed outline-none ring-brand-navy/20 transition-shadow focus-visible:ring-2"
              value={cosJobDescription}
              onChange={(e) => setCosJobDescription(e.target.value)}
              aria-label={t("workerDetail.rc.cos")}
            />
          </div>
          <div className="space-y-2 rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm">
            <Label className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
              {t("workerDetail.rc.contract")}
            </Label>
            <textarea
              className="min-h-[160px] w-full rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2.5 text-sm leading-relaxed outline-none ring-brand-navy/20 transition-shadow focus-visible:ring-2"
              value={contractDuties}
              onChange={(e) => setContractDuties(e.target.value)}
              aria-label={t("workerDetail.rc.contract")}
            />
          </div>
          <div className="space-y-2 rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm">
            <Label className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
              {t("workerDetail.rc.actualDuties")}
            </Label>
            <textarea
              className="min-h-[160px] w-full rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2.5 text-sm leading-relaxed outline-none ring-brand-navy/20 transition-shadow focus-visible:ring-2"
              value={actualDuties}
              onChange={(e) => setActualDuties(e.target.value)}
              aria-label={t("workerDetail.rc.actualDuties")}
            />
          </div>
        </div>

        <div className="space-y-2 rounded-xl border border-dashed border-slate-300/90 bg-slate-50/40 p-4">
          <Label className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
            {t("workerDetail.rc.internalDesc")}
          </Label>
          <textarea
            className="min-h-[72px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-brand-navy/20 transition-shadow focus-visible:ring-2"
            value={internalJobDesc}
            onChange={(e) => setInternalJobDesc(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 text-xs text-slate-600">
          <span>
            <span className="font-semibold text-slate-700">
              {t("workerDetail.rc.lastReviewedAt")}:
            </span>{" "}
            {rc.lastReviewed
              ? new Date(rc.lastReviewed).toLocaleString(
                  locale === "tr" ? "tr-TR" : "en-GB"
                )
              : "—"}
          </span>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={reviewing || saving}
              onClick={() => void recordReview()}
            >
              {reviewing ? t("workerDetail.rc.recordReviewing") : t("workerDetail.rc.recordReview")}
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={saving || reviewing}
              onClick={() => void save()}
            >
              {saving ? t("workerDetail.rc.saving") : t("workerDetail.rc.save")}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
