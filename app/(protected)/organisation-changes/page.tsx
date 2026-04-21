"use client";

import { useCallback, useEffect, useState } from "react";
import type { OrgChange } from "@prisma/client";
import { OrgChangeType } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const TYPE_LABELS: Record<OrgChangeType, string> = {
  COMPANY_SIZE_CHANGE: "Company size change",
  CHARITY_STATUS_CHANGE: "Charity status change",
  KEY_PERSONNEL_CHANGE: "Key personnel change",
  BRANCH_OPEN_CLOSE: "Branch open / close",
  MERGER: "Merger",
  TAKEOVER: "Takeover",
  TUPE_TRANSFER: "TUPE transfer",
  RESTRUCTURING: "Restructuring",
  INSOLVENCY: "Insolvency",
  ADMINISTRATION: "Administration",
  LIQUIDATION: "Liquidation",
  CVA: "CVA",
  ADDRESS_CHANGE: "Address change",
  NAME_CHANGE: "Name change",
};

function deadlineBadge(deadline: Date): {
  label: string;
  variant: "danger" | "warning" | "outline" | "success";
} {
  const now = new Date();
  const dayMs = 86400000;
  const days = Math.ceil(
    (new Date(deadline).getTime() - now.getTime()) / dayMs
  );
  if (days < 0) {
    return { label: "Overdue", variant: "danger" };
  }
  if (days <= 7) {
    return { label: `${days}d to HO deadline`, variant: "danger" };
  }
  if (days <= 30) {
    return { label: `${days}d to HO deadline`, variant: "warning" };
  }
  return { label: `${days}d to HO deadline`, variant: "outline" };
}

export default function OrganisationChangesPage(): JSX.Element {
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
        setError("Could not load organisation changes");
        return;
      }
      const json = (await res.json()) as { data: OrgChange[] };
      setRows(json.data);
    } finally {
      setLoading(false);
    }
  }, []);

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
        setError(j.error ?? "Create failed");
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
    if (!window.confirm("Mark as reported to the Home Office?")) return;
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
        setError(j.error ?? "Update failed");
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
          Organisation changes
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Track sponsor-relevant company changes, HO reporting deadlines, and
          evidence references.
        </p>
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">New change</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-3 text-sm" onSubmit={(e) => void createRecord(e)}>
            <div className="space-y-1">
              <Label>Change type</Label>
              <select
                className="h-10 w-full rounded-md border border-slate-300 bg-white px-3"
                value={changeType}
                onChange={(e) =>
                  setChangeType(e.target.value as OrgChangeType)
                }
              >
                {(Object.keys(TYPE_LABELS) as OrgChangeType[]).map((t) => (
                  <option key={t} value={t}>
                    {TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <textarea
                className="min-h-[100px] w-full rounded-md border border-slate-300 p-2"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                placeholder="What changed and sponsor impact"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Effective date</Label>
                <Input
                  type="date"
                  value={effectiveDate}
                  onChange={(e) => setEffectiveDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label>HO report deadline</Label>
                <Input
                  type="date"
                  value={hoReportDeadline}
                  onChange={(e) => setHoReportDeadline(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Notes (optional)</Label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Internal notes"
              />
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Add change"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-4 text-lg font-medium text-slate-900">Timeline</h2>
        {loading ? (
          <p className="text-sm text-slate-600">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-slate-500">No records yet.</p>
        ) : (
          <ul className="relative space-y-0 border-l-2 border-slate-200 pl-6">
            {rows.map((r) => {
              const dl = deadlineBadge(new Date(r.hoReportDeadline));
              const reported = r.reportedToHO;
              return (
                <li key={r.id} className="relative pb-10 last:pb-0">
                  <span className="absolute -left-[9px] top-1.5 h-4 w-4 rounded-full border-2 border-white bg-brand-navy ring-2 ring-slate-200" />
                  <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2 space-y-0 pb-2">
                      <div>
                        <CardTitle className="text-sm font-semibold text-slate-900">
                          {TYPE_LABELS[r.changeType] ?? r.changeType}
                        </CardTitle>
                        <p className="text-xs text-slate-500">
                          Effective{" "}
                          {new Date(r.effectiveDate).toLocaleDateString("en-GB")}{" "}
                          · Status {r.status}
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
                          {reported ? "Reported to HO" : dl.label}
                        </Badge>
                        <Badge variant="outline">{r.status}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm text-slate-700">
                      <p className="whitespace-pre-wrap">{r.description}</p>
                      {r.hoReportDate ? (
                        <p className="text-xs text-slate-500">
                          HO report date:{" "}
                          {new Date(r.hoReportDate).toLocaleDateString("en-GB")}
                        </p>
                      ) : null}
                      {r.evidenceDocuments.length > 0 ? (
                        <p className="text-xs">
                          <span className="font-medium">Evidence: </span>
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
                          Report to HO
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
