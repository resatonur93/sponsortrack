"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { Vacancy, VacancyStatus } from "@prisma/client";
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

function statusBadgeVariant(status: VacancyStatus): "outline" | "success" | "danger" | "secondary" {
  switch (status) {
    case "CONVERTED":
      return "success";
    case "REJECTED":
    case "CLOSED":
      return "danger";
    case "APPROVED":
      return "secondary";
    default:
      return "outline";
  }
}

export default function VacanciesPage(): JSX.Element {
  const { t } = useTranslation();
  const [rows, setRows] = useState<Vacancy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [jobTitle, setJobTitle] = useState("");
  const [occupationCode, setOccupationCode] = useState("");
  const [proposedSalary, setProposedSalary] = useState("");
  const [hoursPerWeek, setHoursPerWeek] = useState("");
  const [workLocation, setWorkLocation] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [notes, setNotes] = useState("");

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/vacancies", { credentials: "include" });
      if (!res.ok) {
        setError(t("vacancies.loadFailed"));
        return;
      }
      const json = (await res.json()) as { data: Vacancy[] };
      setRows(json.data);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function createVacancy(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!jobTitle.trim() || !occupationCode.trim() || !proposedSalary || !workLocation.trim() || !jobDescription.trim()) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/vacancies", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobTitle: jobTitle.trim(),
          occupationCode: occupationCode.trim(),
          proposedSalary: Number(proposedSalary),
          hoursPerWeek: hoursPerWeek ? Number(hoursPerWeek) : null,
          workLocation: workLocation.trim(),
          jobDescription: jobDescription.trim(),
          notes: notes.trim() || null,
        }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setError(j.error ?? t("vacancies.saveFailed"));
        return;
      }
      setJobTitle("");
      setOccupationCode("");
      setProposedSalary("");
      setHoursPerWeek("");
      setWorkLocation("");
      setJobDescription("");
      setNotes("");
      await load();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-brand-navy">{t("vacancies.title")}</h1>
        <p className="mt-1 text-sm text-slate-600">{t("vacancies.subtitle")}</p>
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("vacancies.newTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-3 text-sm" onSubmit={(e) => void createVacancy(e)}>
            <div className="space-y-1">
              <Label>{t("vacancies.jobTitle")}</Label>
              <Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} required />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>{t("vacancies.occupationCode")}</Label>
                <Input
                  value={occupationCode}
                  onChange={(e) => setOccupationCode(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label>{t("vacancies.proposedSalary")}</Label>
                <Input
                  type="number"
                  min={0}
                  value={proposedSalary}
                  onChange={(e) => setProposedSalary(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>{t("vacancies.workLocation")}</Label>
                <Input
                  value={workLocation}
                  onChange={(e) => setWorkLocation(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label>{t("vacancies.hoursPerWeekOptional")}</Label>
                <Input
                  type="number"
                  min={1}
                  value={hoursPerWeek}
                  onChange={(e) => setHoursPerWeek(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>{t("vacancies.jobDescription")}</Label>
              <textarea
                className="min-h-[100px] w-full rounded-md border border-slate-300 p-2 text-sm"
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                required
              />
            </div>
            <Input
              placeholder={t("vacancies.notesPlaceholder")}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <Button type="submit" disabled={saving}>
              {saving ? t("vacancies.saving") : t("vacancies.create")}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-4 text-lg font-medium text-slate-900">{t("vacancies.listTitle")}</h2>
        {loading ? (
          <p className="text-sm text-slate-600">{t("common.loading")}</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-slate-500">{t("vacancies.noneYet")}</p>
        ) : (
          <ul className="space-y-3">
            {rows.map((r) => (
              <li key={r.id}>
                <Link href={`/vacancies/${r.id}`}>
                  <Card className="border-slate-200 shadow-sm transition-shadow hover:shadow-md">
                    <CardContent className="flex flex-wrap items-center justify-between gap-2 py-4">
                      <div>
                        <p className="font-semibold text-slate-900">{r.jobTitle}</p>
                        <p className="text-xs text-slate-500">
                          {r.occupationCode} · {r.workLocation} · £{r.proposedSalary.toLocaleString()}
                        </p>
                      </div>
                      <Badge variant={statusBadgeVariant(r.status)}>
                        {tEnum(t, `vacancies.status.${r.status}`, r.status)}
                      </Badge>
                    </CardContent>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
