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
import { useTranslation } from "@/contexts/LanguageContext";

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

export default function PoliciesPage(): JSX.Element {
  const { t, locale } = useTranslation();
  const localeTag = locale === "tr" ? "tr-TR" : "en-GB";
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
      setError(t("policies.loadError"));
      return;
    }
    const json = (await res.json()) as { data: PolicyRow[] };
    setRows(json.data);
    setError(null);
  }, [t]);

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
      t(`policies.cat.${a[0]}`).localeCompare(t(`policies.cat.${b[0]}`))
    );
  }, [rows, t]);

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
      alert(t("policies.ackFailed"));
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
    return <p className="text-slate-600">{t("common.loading")}</p>;
  }
  if (error) {
    return <p className="text-brand-rose">{error}</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-navy">{t("policies.title")}</h1>
        <p className="text-slate-600">{t("policies.subtitle")}</p>
      </div>

      {grouped.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-slate-500">
            {t("policies.empty")}
          </CardContent>
        </Card>
      ) : (
        grouped.map(([category, list]) => (
          <Card key={category}>
            <CardHeader>
              <CardTitle className="text-base">
                {t(`policies.cat.${category}`)}
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
                      v{p.version} · {t("policies.effectiveLabel")}{" "}
                      {new Date(p.effectiveDate).toLocaleDateString(localeTag)}
                      {p.isAcknowledgementRequired
                        ? ` · ${t("policies.ackRequiredChip")}`
                        : ""}
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
                        ? t("policies.pending")
                        : t("policies.acknowledged")}
                    </Badge>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => void openWho(p.id)}
                    >
                      {t("policies.whoAck")}
                    </Button>
                    {!p.myAcknowledgedAt ? (
                      <Button
                        type="button"
                        size="sm"
                        disabled={ackBusy === p.id}
                        onClick={() => void acknowledge(p.id)}
                      >
                        {p.isAcknowledgementRequired
                          ? t("policies.acknowledge")
                          : t("policies.markRead")}
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
            <DialogTitle>{detail?.title ?? t("policies.dialogFallback")}</DialogTitle>
          </DialogHeader>
          {detailLoading ? (
            <p className="text-sm text-slate-500">{t("common.loading")}</p>
          ) : detail ? (
            <div className="space-y-3 text-sm">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">v{detail.version}</Badge>
                <Badge variant="outline">
                  {t("policies.effectiveLabel")}{" "}
                  {new Date(detail.effectiveDate).toLocaleDateString(localeTag)}
                </Badge>
                <Badge
                  variant={
                    detail.status === "Pending" && detail.isAcknowledgementRequired
                      ? "warning"
                      : "success"
                  }
                >
                  {detail.status === "Pending" && detail.isAcknowledgementRequired
                    ? t("policies.pending")
                    : t("policies.acknowledged")}
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
                    ? t("policies.acknowledgePolicy")
                    : t("policies.markRead")}
                </Button>
              ) : (
                <p className="text-xs text-slate-500">
                  {t("policies.youAckedOn")}{" "}
                  {new Date(detail.myAcknowledgedAt).toLocaleString(localeTag)}.
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
            <DialogTitle>{t("policies.ackDialogTitle")}</DialogTitle>
          </DialogHeader>
          {whoLoading ? (
            <p className="text-sm text-slate-500">{t("common.loading")}</p>
          ) : whoRows.length === 0 ? (
            <p className="text-sm text-slate-500">{t("policies.noAckYet")}</p>
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
                    {new Date(r.acknowledgedAt).toLocaleString(localeTag)}
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
