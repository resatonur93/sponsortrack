"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { AbsenceRecord } from "@prisma/client";
import { AbsenceStatus, AbsenceType } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toDateOnlyIso } from "@/lib/uk-working-days";
import { useTranslation } from "@/contexts/LanguageContext";

type ContactRow = { date: string; method: string; result: string };

function tEnum(
  translate: (key: string, fallback?: string) => string,
  key: string,
  fallback: string
): string {
  const v = translate(key, fallback);
  return v === key ? fallback : v;
}

const ABSENCE_TYPES = [
  "UNAUTHORISED",
  "SICK",
  "ANNUAL_LEAVE",
  "SUSPENDED",
  "MATERNITY_PATERNITY",
  "OTHER",
] as const;

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function isDayInAbsence(day: Date, a: AbsenceRecord): boolean {
  const s = startOfDay(new Date(a.startDate));
  const e = startOfDay(a.endDate ? new Date(a.endDate) : new Date());
  const t = startOfDay(day);
  return t >= s && t <= e;
}

function absenceDayClass(day: Date, absences: AbsenceRecord[]): string {
  for (const a of absences) {
    if (!isDayInAbsence(day, a)) continue;
    if (a.type === AbsenceType.UNAUTHORISED) return "bg-red-200 text-red-950";
    return "bg-emerald-200 text-emerald-950";
  }
  return "bg-slate-50 text-slate-600";
}

export function AbsenceTrackerPanel(props: {
  workerId: string;
  onChanged: () => void;
}): JSX.Element {
  const { t, locale } = useTranslation();
  const dateTag = locale === "tr" ? "tr-TR" : "en-GB";
  const [rows, setRows] = useState<AbsenceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });

  const [selId, setSelId] = useState<string | null>(null);
  const selected = useMemo(
    () => rows.find((r) => r.id === selId) ?? null,
    [rows, selId]
  );

  const [formStart, setFormStart] = useState("");
  const [formEnd, setFormEnd] = useState("");
  const [formType, setFormType] = useState<AbsenceType>(
    AbsenceType.UNAUTHORISED
  );
  const [formReason, setFormReason] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [caDate, setCaDate] = useState("");
  const [caMethod, setCaMethod] = useState("");
  const [caResult, setCaResult] = useState("");

  const [addCaDate, setAddCaDate] = useState("");
  const [addCaMethod, setAddCaMethod] = useState("");
  const [addCaResult, setAddCaResult] = useState("");

  const [rtwDate, setRtwDate] = useState("");
  const [rtwNotes, setRtwNotes] = useState("");

  const weekdayLabels = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(dateTag, { weekday: "short" });
    return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(2024, 0, 1 + i)));
  }, [dateTag]);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/workers/${props.workerId}/absences`, {
        credentials: "include",
      });
      if (!res.ok) {
        setError(t("absenceTracker.loadFailed"));
        return;
      }
      const json = (await res.json()) as { data: AbsenceRecord[] };
      setRows(json.data);
    } finally {
      setLoading(false);
    }
  }, [props.workerId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!selected) {
      setRtwDate("");
      setRtwNotes("");
      return;
    }
    setRtwDate(
      selected.returnToWorkDate
        ? toDateOnlyIso(new Date(selected.returnToWorkDate))
        : ""
    );
    setRtwNotes(selected.returnToWorkNotes ?? "");
  }, [selected]);

  const calendarDays = useMemo(() => {
    const { y, m } = cursor;
    const first = new Date(y, m, 1);
    const last = new Date(y, m + 1, 0);
    const startPad = (first.getDay() + 6) % 7;
    const days: (Date | null)[] = [];
    for (let i = 0; i < startPad; i += 1) days.push(null);
    for (let d = 1; d <= last.getDate(); d += 1) {
      days.push(new Date(y, m, d));
    }
    while (days.length % 7 !== 0) days.push(null);
    return days;
  }, [cursor]);

  async function submitNew(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!formStart) return;
    const attempts: ContactRow[] = [];
    if (formType === AbsenceType.UNAUTHORISED) {
      if (!caDate || !caMethod.trim() || !caResult.trim()) {
        setError(t("absenceTracker.unauthorisedRequiresContact"));
        return;
      }
      attempts.push({ date: caDate, method: caMethod.trim(), result: caResult.trim() });
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/workers/${props.workerId}/absences`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: formStart,
          endDate: formEnd || null,
          type: formType,
          reason: formReason || null,
          notes: formNotes || null,
          contactAttempts: attempts,
        }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setError(j.error ?? t("absenceTracker.saveFailed"));
        return;
      }
      setFormStart("");
      setFormEnd("");
      setFormReason("");
      setFormNotes("");
      setCaDate("");
      setCaMethod("");
      setCaResult("");
      await load();
      props.onChanged();
    } finally {
      setSaving(false);
    }
  }

  async function saveReturnToWork(): Promise<void> {
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/absences/${selected.id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          returnToWorkDate: rtwDate || null,
          returnToWorkNotes: rtwNotes || null,
          status: rtwDate ? AbsenceStatus.RETURNED : undefined,
        }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setError(j.error ?? t("absenceTracker.updateFailed"));
        return;
      }
      await load();
      props.onChanged();
    } finally {
      setSaving(false);
    }
  }

  async function addContactAttempt(): Promise<void> {
    if (!selected) return;
    if (!addCaDate || !addCaMethod.trim() || !addCaResult.trim()) {
      setError(t("absenceTracker.fillContactAttempt"));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/absences/${selected.id}/contact-attempt`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date: addCaDate,
            method: addCaMethod.trim(),
            result: addCaResult.trim(),
          }),
        }
      );
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setError(j.error ?? t("absenceTracker.addAttemptFailed"));
        return;
      }
      setAddCaDate("");
      setAddCaMethod("");
      setAddCaResult("");
      await load();
      props.onChanged();
    } finally {
      setSaving(false);
    }
  }

  const attempts = useMemo((): ContactRow[] => {
    if (!selected?.contactAttempts) return [];
    const raw = selected.contactAttempts as unknown;
    if (!Array.isArray(raw)) return [];
    return raw.filter(
      (x): x is ContactRow =>
        typeof x === "object" &&
        x !== null &&
        "date" in x &&
        "method" in x &&
        "result" in x
    );
  }, [selected]);

  if (loading && rows.length === 0) {
    return (
      <p className="text-sm text-slate-600">{t("absenceTracker.loading")}</p>
    );
  }

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base">{t("absenceTracker.calendarTitle")}</CardTitle>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setCursor((c) =>
                    c.m <= 0 ? { y: c.y - 1, m: 11 } : { y: c.y, m: c.m - 1 }
                  )
                }
              >
                ←
              </Button>
              <span className="text-sm font-medium text-slate-700">
                {new Date(cursor.y, cursor.m).toLocaleString(dateTag, {
                  month: "long",
                  year: "numeric",
                })}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setCursor((c) =>
                    c.m >= 11 ? { y: c.y + 1, m: 0 } : { y: c.y, m: c.m + 1 }
                  )
                }
              >
                →
              </Button>
            </div>
          </div>
          <p className="text-xs text-slate-500">{t("absenceTracker.calendarHint")}</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium uppercase text-slate-500">
            {weekdayLabels.map((d, i) => (
              <div key={`${d}-${i}`}>{d}</div>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {calendarDays.map((day, i) =>
              day ? (
                <div
                  key={i}
                  className={`flex aspect-square items-center justify-center rounded text-xs font-medium ${absenceDayClass(day, rows)}`}
                >
                  {day.getDate()}
                </div>
              ) : (
                <div key={i} className="aspect-square" />
              )
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t("absenceTracker.newAbsenceTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-3 text-sm" onSubmit={(e) => void submitNew(e)}>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label>{t("absenceTracker.start")}</Label>
                  <Input
                    type="date"
                    value={formStart}
                    onChange={(e) => setFormStart(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label>{t("absenceTracker.endOptional")}</Label>
                  <Input
                    type="date"
                    value={formEnd}
                    onChange={(e) => setFormEnd(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label>{t("absenceTracker.type")}</Label>
                <select
                  className="h-10 w-full rounded-md border border-slate-300 bg-white px-3"
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as AbsenceType)}
                >
                  {ABSENCE_TYPES.map((at) => (
                    <option key={at} value={at}>
                      {tEnum(t, `absenceTracker.type.${at}`, at.replace(/_/g, " "))}
                    </option>
                  ))}
                </select>
              </div>
              <Input
                placeholder={t("absenceTracker.reasonPlaceholder")}
                value={formReason}
                onChange={(e) => setFormReason(e.target.value)}
              />
              <textarea
                className="min-h-[72px] w-full rounded-md border border-slate-300 p-2 text-sm"
                placeholder={t("absenceTracker.notesPlaceholder")}
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
              />
              {formType === AbsenceType.UNAUTHORISED ? (
                <div className="rounded-md border border-amber-200 bg-amber-50/80 p-3 space-y-2">
                  <p className="text-xs font-semibold text-amber-900">
                    {t("absenceTracker.contactAttemptRequired")}
                  </p>
                  <Input
                    type="date"
                    value={caDate}
                    onChange={(e) => setCaDate(e.target.value)}
                  />
                  <Input
                    placeholder={t("absenceTracker.methodPlaceholder")}
                    value={caMethod}
                    onChange={(e) => setCaMethod(e.target.value)}
                  />
                  <Input
                    placeholder={t("absenceTracker.resultPlaceholder")}
                    value={caResult}
                    onChange={(e) => setCaResult(e.target.value)}
                  />
                </div>
              ) : null}
              <Button type="submit" size="sm" disabled={saving}>
                {saving ? t("absenceTracker.saving") : t("absenceTracker.createAbsence")}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t("absenceTracker.recordsTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {rows.length === 0 ? (
              <p className="text-sm text-slate-500">{t("absenceTracker.noAbsencesYet")}</p>
            ) : (
              <ul className="max-h-64 space-y-2 overflow-y-auto text-sm">
                {rows.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      className={`w-full rounded border px-3 py-2 text-left transition ${
                        selId === r.id
                          ? "border-brand-navy bg-brand-navy/5"
                          : "border-slate-100 hover:bg-slate-50"
                      }`}
                      onClick={() => setSelId(r.id)}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">
                          {new Date(r.startDate).toLocaleDateString(dateTag)} –{" "}
                          {r.endDate
                            ? new Date(r.endDate).toLocaleDateString(dateTag)
                            : t("absenceTracker.ongoing")}
                        </span>
                        <Badge variant="outline" className="text-[10px]">
                          {tEnum(t, `absenceTracker.type.${r.type}`, r.type.replace(/_/g, " "))}
                        </Badge>
                        {r.isReportable ||
                        (r.type === AbsenceType.UNAUTHORISED &&
                          (r.consecutiveWorkingDays ?? 0) >= 10) ? (
                          <Badge variant="danger">{t("absenceTracker.tenWorkingDays")}</Badge>
                        ) : null}
                      </div>
                      <div className="text-xs text-slate-500">
                        {r.consecutiveWorkingDays != null
                          ? t("absenceTracker.ukWorkingDays").replace(
                              "{n}",
                              String(r.consecutiveWorkingDays)
                            )
                          : null}{" "}
                        · {tEnum(t, `absenceTracker.status.${r.status}`, r.status)}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {selected ? (
              <div className="space-y-4 border-t border-slate-100 pt-4">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase text-slate-500">
                    {t("absenceTracker.contactAttemptsTitle")}
                  </p>
                  <ul className="space-y-2 text-xs">
                    {attempts.length === 0 ? (
                      <li className="text-slate-500">{t("absenceTracker.noneLogged")}</li>
                    ) : (
                      attempts.map((a, idx) => (
                        <li
                          key={`${a.date}-${idx}`}
                          className="rounded border border-slate-100 bg-slate-50/80 p-2"
                        >
                          <strong>{a.date}</strong> · {a.method} — {a.result}
                        </li>
                      ))
                    )}
                  </ul>
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    <Input
                      type="date"
                      value={addCaDate}
                      onChange={(e) => setAddCaDate(e.target.value)}
                    />
                    <Input
                      placeholder={t("absenceTracker.methodPlaceholder")}
                      value={addCaMethod}
                      onChange={(e) => setAddCaMethod(e.target.value)}
                    />
                    <Input
                      placeholder={t("absenceTracker.resultPlaceholder")}
                      value={addCaResult}
                      onChange={(e) => setAddCaResult(e.target.value)}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    disabled={saving}
                    onClick={() => void addContactAttempt()}
                  >
                    {t("absenceTracker.addAttempt")}
                  </Button>
                </div>

                <div>
                  <p className="mb-2 text-xs font-semibold uppercase text-slate-500">
                    {t("absenceTracker.returnToWorkTitle")}
                  </p>
                  <Input
                    type="date"
                    value={rtwDate}
                    onChange={(e) => setRtwDate(e.target.value)}
                    className="mb-2"
                  />
                  <textarea
                    className="min-h-[60px] w-full rounded-md border border-slate-300 p-2 text-sm"
                    placeholder={t("absenceTracker.returnToWorkNotesPlaceholder")}
                    value={rtwNotes}
                    onChange={(e) => setRtwNotes(e.target.value)}
                  />
                  <Button
                    type="button"
                    size="sm"
                    className="mt-2"
                    disabled={saving}
                    onClick={() => void saveReturnToWork()}
                  >
                    {t("absenceTracker.saveReturnToWork")}
                  </Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
