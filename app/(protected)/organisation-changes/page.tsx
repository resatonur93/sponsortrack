"use client";

import { useCallback, useEffect, useState } from "react";
import type { OrgChange } from "@prisma/client";
import { OrgChangeStatus, OrgChangeType } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/contexts/LanguageContext";

function tEnum(
  translate: (key: string, fallback?: string) => string,
  key: string,
  fallback: string
): string {
  const v = translate(key, fallback);
  return v === key ? fallback : v;
}

function orgChangeTypeLabel(
  type: OrgChangeType,
  t: (key: string, fallback?: string) => string
): string {
  return tEnum(t, `orgChange.type.${type}`, type);
}

function orgChangeStatusLabel(
  status: OrgChangeStatus,
  t: (key: string, fallback?: string) => string
): string {
  return tEnum(t, `orgChange.status.${status}`, status);
}

function deadlineBadge(
  deadline: Date,
  t: (key: string, fallback?: string) => string
): {
  label: string;
  variant: "danger" | "warning" | "outline" | "success";
} {
  const now = new Date();
  const dayMs = 86400000;
  const days = Math.ceil(
    (new Date(deadline).getTime() - now.getTime()) / dayMs
  );
  const daysLabel = t("orgChange.daysToHoDeadline").replace("{n}", String(days));
  if (days < 0) {
    return { label: t("orgChange.overdue"), variant: "danger" };
  }
  if (days <= 7) {
    return { label: daysLabel, variant: "danger" };
  }
  if (days <= 30) {
    return { label: daysLabel, variant: "warning" };
  }
  return { label: daysLabel, variant: "outline" };
}

export default function OrganisationChangesPage(): JSX.Element {
  const { t, locale } = useTranslation();
  const localeTag = locale === "tr" ? "tr-TR" : "en-GB";

  const [rows, setRows] = useState<OrgChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [changeType, setChangeType] = useState<OrgChangeType>(
    OrgChangeType.RESTRUCTURING
  );
  const [description, setDescription] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [hoReportDeadline, setHoReportDeadline] = useState("");
  const [notes, setNotes] = useState("");

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/org-changes", { credentials: "include" });
      if (!res.ok) {
        setError(t("orgChange.loadFailed"));
        return;
      }
      const json = (await res.json()) as { data: OrgChange[] };
      setRows(json.data);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function createRecord(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!description.trim() || !effectiveDate || !hoReportDeadline) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/org-changes", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          changeType,
          description: description.trim(),
          effectiveDate,
          hoReportDeadline,
          notes: notes.trim() || null,
        }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setError(j.error ?? t("orgChange.createFailed"));
        return;
      }
      setDescription("");
      setNotes("");
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function reportToHo(id: string): Promise<void> {
    if (!window.confirm(t("orgChange.confirmReportToHo"))) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/org-changes/${id}/report-to-ho`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setError(j.error ?? t("orgChange.updateFailed"));
        return;
      }
      await load();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-brand-navy">
          {t("orgChange.title")}
        </h1>
        <p className="mt-1 text-sm text-slate-600">{t("orgChange.subtitle")}</p>
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("orgChange.newChangeTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-3 text-sm" onSubmit={(e) => void createRecord(e)}>
            <div className="space-y-1">
              <Label>{t("orgChange.labelChangeType")}</Label>
              <select
                className="h-10 w-full rounded-md border border-slate-300 bg-white px-3"
                value={changeType}
                onChange={(e) =>
                  setChangeType(e.target.value as OrgChangeType)
                }
              >
                {Object.values(OrgChangeType).map((ct) => (
                  <option key={ct} value={ct}>
                    {orgChangeTypeLabel(ct, t)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label>{t("orgChange.labelDescription")}</Label>
              <textarea
                className="min-h-[100px] w-full rounded-md border border-slate-300 p-2"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                placeholder={t("orgChange.placeholderDescription")}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>{t("orgChange.labelEffectiveDate")}</Label>
                <Input
                  type="date"
                  value={effectiveDate}
                  onChange={(e) => setEffectiveDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label>{t("orgChange.labelHoDeadline")}</Label>
                <Input
                  type="date"
                  value={hoReportDeadline}
                  onChange={(e) => setHoReportDeadline(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>{t("orgChange.labelNotes")}</Label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t("orgChange.placeholderNotes")}
              />
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? t("orgChange.saving") : t("orgChange.addChange")}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-4 text-lg font-medium text-slate-900">
          {t("orgChange.timelineTitle")}
        </h2>
        {loading ? (
          <p className="text-sm text-slate-600">{t("common.loading")}</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-slate-500">{t("orgChange.emptyState")}</p>
        ) : (
          <ul className="relative space-y-0 border-l-2 border-slate-200 pl-6">
            {rows.map((r) => {
              const dl = deadlineBadge(new Date(r.hoReportDeadline), t);
              const reported = r.reportedToHO;
              return (
                <li key={r.id} className="relative pb-10 last:pb-0">
                  <span className="absolute -left-[9px] top-1.5 h-4 w-4 rounded-full border-2 border-white bg-brand-navy ring-2 ring-slate-200" />
                  <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2 space-y-0 pb-2">
                      <div>
                        <CardTitle className="text-sm font-semibold text-slate-900">
                          {orgChangeTypeLabel(r.changeType, t)}
                        </CardTitle>
                        <p className="text-xs text-slate-500">
                          {t("orgChange.effective")}{" "}
                          {new Date(r.effectiveDate).toLocaleDateString(localeTag)}{" "}
                          · {t("orgChange.status")} {orgChangeStatusLabel(r.status, t)}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        <Badge
                          variant={
                            reported
                              ? "success"
                              : dl.variant === "danger"
                                ? "danger"
                                : dl.variant === "warning"
                                  ? "warning"
                                  : "outline"
                          }
                        >
                          {reported ? t("orgChange.reportedToHo") : dl.label}
                        </Badge>
                        <Badge variant="outline">
                          {orgChangeStatusLabel(r.status, t)}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm text-slate-700">
                      <p className="whitespace-pre-wrap">{r.description}</p>
                      {r.hoReportDate ? (
                        <p className="text-xs text-slate-500">
                          {t("orgChange.hoReportDatePrefix")}:{" "}
                          {new Date(r.hoReportDate).toLocaleDateString(localeTag)}
                        </p>
                      ) : null}
                      {r.evidenceDocuments.length > 0 ? (
                        <p className="text-xs">
                          <span className="font-medium">
                            {t("orgChange.evidencePrefix")}:{" "}
                          </span>
                          {r.evidenceDocuments.join(", ")}
                        </p>
                      ) : null}
                      {r.notes ? (
                        <p className="text-xs text-slate-600">{r.notes}</p>
                      ) : null}
                      {!reported ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled={saving}
                          className={cn(
                            dl.variant === "danger" && "border-red-200 bg-red-50 text-red-900 hover:bg-red-100"
                          )}
                          onClick={() => void reportToHo(r.id)}
                        >
                          {t("orgChange.reportToHoButton")}
                        </Button>
                      ) : null}
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
