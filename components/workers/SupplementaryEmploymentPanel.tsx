"use client";

import { useCallback, useEffect, useState } from "react";
import type { SupplementaryEmployment } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslation } from "@/contexts/LanguageContext";

function tEnum(
  translate: (key: string, fallback?: string) => string,
  key: string,
  fallback: string
): string {
  const v = translate(key, fallback);
  return v === key ? fallback : v;
}

export function SupplementaryEmploymentPanel(props: {
  workerId: string;
  onChanged: () => void;
}): JSX.Element {
  const { t, locale } = useTranslation();
  const dateTag = locale === "tr" ? "tr-TR" : "en-GB";
  const [rows, setRows] = useState<SupplementaryEmployment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [employerName, setEmployerName] = useState("");
  const [occupationCode, setOccupationCode] = useState("");
  const [isSameOccupation, setIsSameOccupation] = useState(true);
  const [isShortageOccupation, setIsShortageOccupation] = useState(false);
  const [hoursPerWeek, setHoursPerWeek] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/workers/${props.workerId}/supplementary-employment`, {
        credentials: "include",
      });
      if (!res.ok) {
        setError(t("supplementaryEmployment.loadFailed"));
        return;
      }
      const json = (await res.json()) as { data: SupplementaryEmployment[] };
      setRows(json.data);
    } finally {
      setLoading(false);
    }
  }, [props.workerId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function submitNew(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!employerName.trim() || !occupationCode.trim() || !hoursPerWeek || !startDate) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/workers/${props.workerId}/supplementary-employment`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employerName: employerName.trim(),
          occupationCode: occupationCode.trim(),
          isSameOccupation,
          isShortageOccupation,
          hoursPerWeek: Number(hoursPerWeek),
          startDate,
          endDate: endDate || null,
          notes: notes.trim() || null,
        }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setError(j.error ?? t("supplementaryEmployment.saveFailed"));
        return;
      }
      setEmployerName("");
      setOccupationCode("");
      setIsSameOccupation(true);
      setIsShortageOccupation(false);
      setHoursPerWeek("");
      setStartDate("");
      setEndDate("");
      setNotes("");
      await load();
      props.onChanged();
    } finally {
      setSaving(false);
    }
  }

  async function markEnded(row: SupplementaryEmployment): Promise<void> {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/supplementary-employment/${row.id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "ENDED",
          endDate: new Date().toISOString().slice(0, 10),
        }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setError(j.error ?? t("supplementaryEmployment.updateFailed"));
        return;
      }
      await load();
      props.onChanged();
    } finally {
      setSaving(false);
    }
  }

  if (loading && rows.length === 0) {
    return <p className="text-sm text-slate-600">{t("supplementaryEmployment.loading")}</p>;
  }

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t("supplementaryEmployment.newTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-3 text-sm" onSubmit={(e) => void submitNew(e)}>
              <div className="space-y-1">
                <Label>{t("supplementaryEmployment.employerName")}</Label>
                <Input
                  value={employerName}
                  onChange={(e) => setEmployerName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label>{t("supplementaryEmployment.occupationCode")}</Label>
                <Input
                  value={occupationCode}
                  onChange={(e) => setOccupationCode(e.target.value)}
                  required
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={isSameOccupation}
                  onChange={(e) => setIsSameOccupation(e.target.checked)}
                />
                {t("supplementaryEmployment.isSameOccupation")}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={isShortageOccupation}
                  onChange={(e) => setIsShortageOccupation(e.target.checked)}
                />
                {t("supplementaryEmployment.isShortageOccupation")}
              </label>
              <div className="space-y-1">
                <Label>{t("supplementaryEmployment.hoursPerWeek")}</Label>
                <Input
                  type="number"
                  min={1}
                  value={hoursPerWeek}
                  onChange={(e) => setHoursPerWeek(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label>{t("supplementaryEmployment.start")}</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label>{t("supplementaryEmployment.endOptional")}</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
              <textarea
                className="min-h-[72px] w-full rounded-md border border-slate-300 p-2 text-sm"
                placeholder={t("supplementaryEmployment.notesPlaceholder")}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
              <Button type="submit" size="sm" disabled={saving}>
                {saving ? t("supplementaryEmployment.saving") : t("supplementaryEmployment.create")}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t("supplementaryEmployment.recordsTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {rows.length === 0 ? (
              <p className="text-sm text-slate-500">{t("supplementaryEmployment.noneYet")}</p>
            ) : (
              <ul className="max-h-96 space-y-2 overflow-y-auto text-sm">
                {rows.map((r) => (
                  <li
                    key={r.id}
                    className="rounded border border-slate-100 px-3 py-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium">{r.employerName}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {tEnum(t, `supplementaryEmployment.status.${r.status}`, r.status)}
                      </Badge>
                    </div>
                    <div className="text-xs text-slate-500">
                      {r.occupationCode} · {r.hoursPerWeek}h/w ·{" "}
                      {new Date(r.startDate).toLocaleDateString(dateTag)} –{" "}
                      {r.endDate
                        ? new Date(r.endDate).toLocaleDateString(dateTag)
                        : t("supplementaryEmployment.ongoing")}
                    </div>
                    {r.flags.length > 0 ? (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {r.flags.map((f) => (
                          <Badge key={f} variant="danger" className="text-[10px]">
                            {tEnum(t, `supplementaryEmployment.flag.${f}`, f)}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                    {r.status === "ACTIVE" ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        disabled={saving}
                        onClick={() => void markEnded(r)}
                      >
                        {t("supplementaryEmployment.markEnded")}
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
