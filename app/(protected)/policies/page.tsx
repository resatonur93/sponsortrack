"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { PolicyCategory } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type PolicyRow = {
  id: string;
  title: string;
  version: string;
  effectiveDate: string;
  category: PolicyCategory;
  isAcknowledgementRequired: boolean;
  createdAt: string;
  myAcknowledgedAt: string | null;
  status: "Pending" | "Acknowledged";
};

const CATEGORY_LABEL: Record<PolicyCategory, string> = {
  SPONSOR_DUTIES: "Sponsor duties",
  IMMIGRATION_RULES: "Immigration rules",
  COMPLIANCE_GUIDANCE: "Compliance guidance",
  DATA_PROTECTION: "Data protection",
  EMPLOYMENT_LAW: "Employment law",
  TRAINING_MATERIAL: "Training material",
};

export default function PoliciesPage(): JSX.Element {
  const [rows, setRows] = useState<PolicyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<{
    title: string;
    content: string;
    version: string;
    effectiveDate: string;
    status: "Pending" | "Acknowledged";
    isAcknowledgementRequired: boolean;
    myAcknowledgedAt: string | null;
  } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [ackBusy, setAckBusy] = useState<string | null>(null);
  const [whoFor, setWhoFor] = useState<string | null>(null);
  const [whoLoading, setWhoLoading] = useState(false);
  const [whoRows, setWhoRows] = useState<
    { userId: string; acknowledgedAt: string; user: { firstName: string; lastName: string; email: string } }[]
  >([]);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    const res = await fetch("/api/policies", { credentials: "include" });
    setLoading(false);
    if (!res.ok) {
      setError("Policies could not be loaded.");
      return;
    }
    const json = (await res.json()) as { data: PolicyRow[] };
    setRows(json.data);
    setError(null);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const grouped = useMemo(() => {
    const m = new Map<PolicyCategory, PolicyRow[]>();
    for (const r of rows) {
      const list = m.get(r.category) ?? [];
      list.push(r);
      m.set(r.category, list);
    }
    return Array.from(m.entries()).sort((a, b) =>
      CATEGORY_LABEL[a[0]].localeCompare(CATEGORY_LABEL[b[0]])
    );
  }, [rows]);

  async function openDetail(id: string): Promise<void> {
    setDetailId(id);
    setDetailLoading(true);
    setDetail(null);
    const res = await fetch(`/api/policies/${id}`, {
      credentials: "include",
      cache: "no-store",
    });
    setDetailLoading(false);
    if (!res.ok) return;
    const json = (await res.json()) as {
      data: {
        title: string;
        content: string;
        version: string;
        effectiveDate: string;
        status: "Pending" | "Acknowledged";
        isAcknowledgementRequired: boolean;
        myAcknowledgedAt: string | null;
      };
    };
    setDetail(json.data);
  }

  async function acknowledge(id: string): Promise<void> {
    setAckBusy(id);
    const res = await fetch(`/api/policies/${id}/acknowledge`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    setAckBusy(null);
    if (!res.ok) {
      alert("Could not record acknowledgement.");
      return;
    }
    await load();
    if (detailId === id) void openDetail(id);
  }

  async function openWho(policyId: string): Promise<void> {
    setWhoFor(policyId);
    setWhoLoading(true);
    setWhoRows([]);
    const res = await fetch(
      `/api/policies/acknowledgement-status?policyId=${encodeURIComponent(policyId)}`,
      { credentials: "include" }
    );
    setWhoLoading(false);
    if (!res.ok) return;
    const json = (await res.json()) as {
      data: {
        acknowledgements: typeof whoRows;
      };
    };
    setWhoRows(json.data.acknowledgements);
  }

  if (loading) {
    return <p className="text-slate-600">Loading…</p>;
  }
  if (error) {
    return <p className="text-brand-rose">{error}</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-navy">Policy Hub</h1>
        <p className="text-slate-600">
          Sponsor guidance and training materials. Acknowledgements are tracked
          per user.
        </p>
      </div>

      {grouped.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-slate-500">
            No policies published yet for your organisation.
          </CardContent>
        </Card>
      ) : (
        grouped.map(([category, list]) => (
          <Card key={category}>
            <CardHeader>
              <CardTitle className="text-base">
                {CATEGORY_LABEL[category]}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {list.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-col gap-2 rounded-lg border border-slate-100 bg-slate-50/80 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <button
                      type="button"
                      className="text-left font-medium text-brand-navy hover:underline"
                      onClick={() => void openDetail(p.id)}
                    >
                      {p.title}
                    </button>
                    <p className="text-xs text-slate-500">
                      v{p.version} · Effective{" "}
                      {new Date(p.effectiveDate).toLocaleDateString("en-GB")}
                      {p.isAcknowledgementRequired ? " · Acknowledgement required" : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant={
                        p.status === "Pending" && p.isAcknowledgementRequired
                          ? "warning"
                          : "success"
                      }
                    >
                      {p.status === "Pending" && p.isAcknowledgementRequired
                        ? "Pending"
                        : "Acknowledged"}
                    </Badge>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => void openWho(p.id)}
                    >
                      Who acknowledged?
                    </Button>
                    {!p.myAcknowledgedAt ? (
                      <Button
                        type="button"
                        size="sm"
                        disabled={ackBusy === p.id}
                        onClick={() => void acknowledge(p.id)}
                      >
                        {p.isAcknowledgementRequired
                          ? "Acknowledge"
                          : "Mark as read"}
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))
      )}

      <Dialog
        open={detailId !== null}
        onOpenChange={(o) => {
          if (!o) {
            setDetailId(null);
            setDetail(null);
          }
        }}
      >
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detail?.title ?? "Policy"}</DialogTitle>
          </DialogHeader>
          {detailLoading ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : detail ? (
            <div className="space-y-3 text-sm">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">v{detail.version}</Badge>
                <Badge variant="outline">
                  Effective {new Date(detail.effectiveDate).toLocaleDateString("en-GB")}
                </Badge>
                <Badge
                  variant={
                    detail.status === "Pending" && detail.isAcknowledgementRequired
                      ? "warning"
                      : "success"
                  }
                >
                  {detail.status === "Pending" && detail.isAcknowledgementRequired
                    ? "Pending"
                    : "Acknowledged"}
                </Badge>
              </div>
              <div className="prose prose-sm max-w-none whitespace-pre-wrap text-slate-800">
                {detail.content}
              </div>
              {!detail.myAcknowledgedAt ? (
                <Button
                  type="button"
                  onClick={() => detailId && void acknowledge(detailId)}
                  disabled={ackBusy !== null}
                >
                  {detail.isAcknowledgementRequired
                    ? "Acknowledge policy"
                    : "Mark as read"}
                </Button>
              ) : (
                <p className="text-xs text-slate-500">
                  You acknowledged this on{" "}
                  {new Date(detail.myAcknowledgedAt).toLocaleString("en-GB")}.
                </p>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={whoFor !== null}
        onOpenChange={(o) => {
          if (!o) {
            setWhoFor(null);
            setWhoRows([]);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Acknowledgements</DialogTitle>
          </DialogHeader>
          {whoLoading ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : whoRows.length === 0 ? (
            <p className="text-sm text-slate-500">No acknowledgements yet.</p>
          ) : (
            <ul className="max-h-64 space-y-2 overflow-y-auto text-sm">
              {whoRows.map((r) => (
                <li
                  key={`${r.userId}-${r.acknowledgedAt}`}
                  className="rounded border border-slate-100 px-2 py-1"
                >
                  <span className="font-medium">
                    {r.user.firstName} {r.user.lastName}
                  </span>{" "}
                  <span className="text-slate-500">({r.user.email})</span>
                  <div className="text-xs text-slate-500">
                    {new Date(r.acknowledgedAt).toLocaleString("en-GB")}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
