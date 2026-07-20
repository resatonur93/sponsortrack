"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import type { Vacancy } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslation } from "@/contexts/LanguageContext";
import { GENUINE_VACANCY_QUESTIONS } from "@/lib/vacancies/genuine-vacancy-checklist";

function tEnum(
  translate: (key: string, fallback?: string) => string,
  key: string,
  fallback: string
): string {
  const v = translate(key, fallback);
  return v === key ? fallback : v;
}

export default function VacancyDetailPage(): JSX.Element {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";

  const [vacancy, setVacancy] = useState<Vacancy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [checklistNotes, setChecklistNotes] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [nationality, setNationality] = useState("");
  const [visaType, setVisaType] = useState("");
  const [cosReference, setCosReference] = useState("");
  const [cosAssignDate, setCosAssignDate] = useState("");
  const [cosExpiryDate, setCosExpiryDate] = useState("");
  const [employmentStartDate, setEmploymentStartDate] = useState("");
  const [convertError, setConvertError] = useState<string | null>(null);
  const [converting, setConverting] = useState(false);

  const load = useCallback(async (): Promise<void> => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/vacancies/${id}`, { credentials: "include" });
      if (!res.ok) {
        setError(t("vacancies.loadFailed"));
        return;
      }
      const json = (await res.json()) as { data: Vacancy };
      setVacancy(json.data);
      setChecklist(
        (json.data.genuineVacancyChecklist as Record<string, boolean> | null) ?? {}
      );
      setChecklistNotes(json.data.genuineVacancyNotes ?? "");
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveChecklist(): Promise<void> {
    if (!vacancy) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/vacancies/${vacancy.id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          genuineVacancyChecklist: checklist,
          genuineVacancyNotes: checklistNotes.trim() || null,
        }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setError(j.error ?? t("vacancies.updateFailed"));
        return;
      }
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function convertToWorker(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!vacancy) return;
    setConverting(true);
    setConvertError(null);
    try {
      const res = await fetch(`/api/vacancies/${vacancy.id}/convert`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          nationality: nationality.trim(),
          visaType: visaType.trim(),
          cosReference: cosReference.trim(),
          cosAssignDate,
          cosExpiryDate,
          employmentStartDate: employmentStartDate || null,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        data?: { workerId: string };
        error?: string;
      };
      if (!res.ok || !json.data) {
        setConvertError(json.error ?? t("vacancies.convertFailed"));
        return;
      }
      router.push(`/workers/${json.data.workerId}`);
    } finally {
      setConverting(false);
    }
  }

  async function deleteVacancy(): Promise<void> {
    if (!vacancy || !window.confirm(t("vacancies.deleteConfirm"))) return;
    const res = await fetch(`/api/vacancies/${vacancy.id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      setError(j.error ?? t("vacancies.deleteFailed"));
      return;
    }
    router.push("/vacancies");
  }

  if (loading || !vacancy) {
    return <p className="text-sm text-slate-600">{t("common.loading")}</p>;
  }

  const isConverted = vacancy.status === "CONVERTED";

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <Link href="/vacancies" className="text-sm text-brand-navy hover:underline">
          {t("vacancies.backToList")}
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-bold text-brand-navy">{vacancy.jobTitle}</h1>
          <Badge variant={isConverted ? "success" : "outline"}>
            {tEnum(t, `vacancies.status.${vacancy.status}`, vacancy.status)}
          </Badge>
        </div>
        <p className="text-sm text-slate-600">
          {vacancy.occupationCode} · {vacancy.workLocation} · £
          {vacancy.proposedSalary.toLocaleString()}
          {vacancy.hoursPerWeek ? ` · ${vacancy.hoursPerWeek}h/w` : ""}
        </p>
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      {isConverted ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {t("vacancies.convertedNotice")}{" "}
          {vacancy.convertedWorkerId ? (
            <Link href={`/workers/${vacancy.convertedWorkerId}`} className="underline">
              {t("vacancies.viewWorker")}
            </Link>
          ) : null}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("vacancies.jobDescription")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap text-sm text-slate-800">{vacancy.jobDescription}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("vacancies.genuineVacancyTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {GENUINE_VACANCY_QUESTIONS.map((q) => (
            <label key={q} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={Boolean(checklist[q])}
                disabled={isConverted}
                onChange={(e) =>
                  setChecklist((c) => ({ ...c, [q]: e.target.checked }))
                }
              />
              {t(`vacancies.question.${q}`)}
            </label>
          ))}
          <div className="space-y-1">
            <Label>{t("vacancies.genuineVacancyNotesLabel")}</Label>
            <textarea
              className="min-h-[80px] w-full rounded-md border border-slate-300 p-2 text-sm"
              value={checklistNotes}
              disabled={isConverted}
              onChange={(e) => setChecklistNotes(e.target.value)}
            />
          </div>
          {!isConverted ? (
            <Button type="button" size="sm" disabled={saving} onClick={() => void saveChecklist()}>
              {saving ? t("vacancies.saving") : t("vacancies.saveChecklist")}
            </Button>
          ) : null}
        </CardContent>
      </Card>

      {!isConverted ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("vacancies.convertTitle")}</CardTitle>
            <p className="text-xs text-slate-500">{t("vacancies.convertHint")}</p>
          </CardHeader>
          <CardContent>
            {convertError ? (
              <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                {convertError}
              </div>
            ) : null}
            <form className="space-y-3 text-sm" onSubmit={(e) => void convertToWorker(e)}>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label>{t("vacancies.firstName")}</Label>
                  <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                </div>
                <div className="space-y-1">
                  <Label>{t("vacancies.lastName")}</Label>
                  <Input value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                </div>
              </div>
              <div className="space-y-1">
                <Label>{t("vacancies.email")}</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label>{t("vacancies.nationality")}</Label>
                  <Input
                    value={nationality}
                    onChange={(e) => setNationality(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label>{t("vacancies.visaType")}</Label>
                  <Input value={visaType} onChange={(e) => setVisaType(e.target.value)} required />
                </div>
              </div>
              <div className="space-y-1">
                <Label>{t("vacancies.cosReference")}</Label>
                <Input
                  value={cosReference}
                  onChange={(e) => setCosReference(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label>{t("vacancies.cosAssignDate")}</Label>
                  <Input
                    type="date"
                    value={cosAssignDate}
                    onChange={(e) => setCosAssignDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label>{t("vacancies.cosExpiryDate")}</Label>
                  <Input
                    type="date"
                    value={cosExpiryDate}
                    onChange={(e) => setCosExpiryDate(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label>{t("vacancies.employmentStartDateOptional")}</Label>
                <Input
                  type="date"
                  value={employmentStartDate}
                  onChange={(e) => setEmploymentStartDate(e.target.value)}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={converting}>
                  {converting ? t("vacancies.saving") : t("vacancies.convert")}
                </Button>
                <Button type="button" variant="outline" onClick={() => void deleteVacancy()}>
                  {t("vacancies.delete")}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
