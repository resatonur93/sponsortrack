"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { PolicyCategory, Role } from "@prisma/client";
import { useSession } from "next-auth/react";
import { ClipboardSignature, Download, Eye, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PolicyUploadDialog } from "@/components/policies/PolicyUploadDialog";
import { useTranslation } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { canManagePolicies } from "@/lib/policies/policy-permissions";

type PolicyRow = {
  id: string;
  title: string;
  version: string;
  effectiveDate: string;
  category: PolicyCategory;
  isAcknowledgementRequired: boolean;
  createdAt: string;
  updatedAt: string;
  fileUrl: string | null;
  myAcknowledgedAt: string | null;
  status: "Pending" | "Acknowledged";
  acknowledgementRatePercent: number;
  acknowledgedUserCount: number;
  tenantUserTotal: number;
};

function tCat(
  t: (key: string, fallback?: string) => string,
  category: PolicyCategory
): string {
  const k = `policies.cat.${category}`;
  const v = t(k, category);
  return v === k ? category.replace(/_/g, " ") : v;
}

export default function PoliciesPage(): JSX.Element {
  const { t, locale } = useTranslation();
  const localeTag = locale === "tr" ? "tr-TR" : "en-GB";
  const { data: session, status: sessionStatus } = useSession();
  const roleClient = session?.user?.role;
  const isManager =
    roleClient !== undefined && roleClient !== null && canManagePolicies(roleClient as Role);

  const [rows, setRows] = useState<PolicyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<{
    title: string;
    content: string;
    version: string;
    effectiveDate: string;
    updatedAt: string;
    category: PolicyCategory;
    status: "Pending" | "Acknowledged";
    isAcknowledgementRequired: boolean;
    myAcknowledgedAt: string | null;
    fileUrl: string | null;
    acknowledgementRatePercent: number;
    acknowledgedUserCount: number;
    tenantUserTotal: number;
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
    return Array.from(m.entries()).sort((a, b) => tCat(t, a[0]).localeCompare(tCat(t, b[0])));
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
    const json = (await res.json()) as { data: NonNullable<typeof detail> };
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
      window.alert(t("policies.ackFailed"));
      return;
    }
    await load();
    if (detailId === id) void openDetail(id);
  }

  async function openWho(policyId: string): Promise<void> {
    if (!isManager) return;
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

  if (sessionStatus === "loading") {
    return <p className="text-slate-600">{t("common.loading")}</p>;
  }
  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-slate-600">
        {t("common.loading")}
      </div>
    );
  }
  if (error) {
    return (
      <div className="space-y-3">
        <p className="text-red-700">{error}</p>
        <Button type="button" variant="outline" onClick={() => void load()}>
          {t("common.retry")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-brand-navy md:text-3xl">{t("policies.title")}</h1>
          <p className="max-w-2xl text-sm text-slate-600">{t("policies.subtitle")}</p>
          <p className="max-w-2xl text-xs text-slate-500">{t("policies.rolesHint")}</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {isManager ? (
            <Button type="button" className="gap-2 font-semibold shadow-sm" onClick={() => setUploadOpen(true)}>
              <Shield className="h-4 w-4" aria-hidden />
              {t("policies.uploadPolicy")}
            </Button>
          ) : null}
        </div>
      </div>

      {grouped.length === 0 ? (
        <Card className="overflow-hidden border-dashed border-slate-200 bg-gradient-to-br from-slate-50/80 via-white to-brand-navy/[0.02] shadow-inner">
          <CardContent className="flex flex-col items-center px-6 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-md ring-1 ring-brand-navy/15">
              <Shield className="h-9 w-9 text-brand-navy opacity-80" aria-hidden />
            </div>
            <CardTitle className="mt-5 max-w-md text-brand-navy">{t("policies.emptyTitle")}</CardTitle>
            <CardDescription className="mt-3 max-w-lg text-base leading-relaxed text-slate-600">
              {isManager ? t("policies.emptyHintAdmin") : t("policies.emptyHintStaff")}
            </CardDescription>
            {isManager ? (
              <Button type="button" className="mt-8 gap-2 font-semibold" onClick={() => setUploadOpen(true)}>
                <ClipboardSignature className="h-4 w-4" aria-hidden />
                {t("policies.uploadPolicy")}
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-10">
          {grouped.map(([category, list]) => (
            <section key={category} className="space-y-4">
              <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                {tCat(t, category)}
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                {list.map((p) => (
                  <Card
                    key={p.id}
                    className="flex flex-col border-slate-200/90 shadow-md shadow-slate-200/40 ring-1 ring-slate-100 transition-shadow hover:shadow-lg"
                  >
                    <CardHeader className="space-y-3 pb-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="font-mono text-[11px]">
                          v{p.version}
                        </Badge>
                        <Badge
                          variant={p.isAcknowledgementRequired ? "danger" : "outline"}
                          className={cn(
                            "font-semibold",
                            !p.isAcknowledgementRequired &&
                              "border-emerald-200 bg-emerald-50 text-emerald-950"
                          )}
                        >
                          {p.isAcknowledgementRequired ? t("policies.badgeMandatory") : t("policies.badgeRecommended")}
                        </Badge>
                        {p.myAcknowledgedAt ? (
                          <Badge variant="success" className="text-[11px] font-semibold">
                            {t("policies.acknowledged")}
                          </Badge>
                        ) : p.isAcknowledgementRequired ? (
                          <Badge variant="warning" className="text-[11px] font-semibold">
                            {t("policies.pending")}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-amber-200 bg-amber-50/70 text-[11px] font-semibold text-amber-950">
                            {t("policies.suggestedUnread")}
                          </Badge>
                        )}
                      </div>
                      <CardTitle className="text-lg leading-snug text-brand-navy">{p.title}</CardTitle>
                      <CardDescription className="text-xs text-slate-600">
                        {t("policies.effectiveLabel")}:{" "}
                        {new Date(p.effectiveDate).toLocaleDateString(localeTag)}{" · "}
                        {t("policies.lastUpdated")}: {new Date(p.updatedAt).toLocaleDateString(localeTag)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-0">
                      <div>
                        <div className="mb-1 flex items-center justify-between text-xs font-medium text-slate-600">
                          <span>{t("policies.readRate")}</span>
                          <span className="tabular-nums">{p.acknowledgementRatePercent}%</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-[width]"
                            style={{ width: `${Math.min(100, p.acknowledgementRatePercent)}%` }}
                          />
                        </div>
                        <p className="mt-1.5 tabular-nums text-[11px] text-slate-500">
                          {p.acknowledgedUserCount} / {p.tenantUserTotal}{" "}
                          {locale === "tr"
                            ? "aktif kullanıcı onayı"
                            : "active user acknowledgements"}
                        </p>
                      </div>
                    </CardContent>
                    <CardFooter className="mt-auto flex flex-wrap gap-2 border-t border-slate-100 bg-slate-50/50 pt-4">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="gap-1.5 font-semibold"
                        onClick={() => void openDetail(p.id)}
                      >
                        <Eye className="h-3.5 w-3.5" aria-hidden />
                        {t("policies.actionView")}
                      </Button>
                      {p.fileUrl ? (
                        <Button type="button" size="sm" variant="outline" className="gap-1.5" asChild>
                          <Link href={p.fileUrl} target="_blank" rel="noopener noreferrer" download>
                            <Download className="h-3.5 w-3.5" aria-hidden />
                            {t("policies.actionDownload")}
                          </Link>
                        </Button>
                      ) : null}
                      {isManager ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => void openWho(p.id)}
                          className="ml-auto lg:ml-0"
                        >
                          {t("policies.whoAck")}
                        </Button>
                      ) : null}
                      {!p.myAcknowledgedAt ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="success"
                          className={cn(isManager ? "" : "ml-auto")}
                          disabled={ackBusy === p.id}
                          onClick={() => void acknowledge(p.id)}
                          title={
                            p.isAcknowledgementRequired
                              ? t("policies.acknowledgePolicy")
                              : undefined
                          }
                        >
                          {t("policies.confirmReadUnderstand")}
                        </Button>
                      ) : null}
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <PolicyUploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onCreated={() => void load()}
      />

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
            <div className="space-y-4 text-sm">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="font-mono">
                  v{detail.version}
                </Badge>
                <Badge variant="outline">{tCat(t, detail.category)}</Badge>
                <Badge variant="outline">
                  {t("policies.effectiveLabel")}:{" "}
                  {new Date(detail.effectiveDate).toLocaleDateString(localeTag)}
                </Badge>
                <Badge variant="outline">
                  {t("policies.lastUpdated")}:{" "}
                  {new Date(detail.updatedAt).toLocaleString(localeTag)}
                </Badge>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2 text-xs tabular-nums text-slate-700">
                {t("policies.readRate")}: {detail.acknowledgementRatePercent}% ({detail.acknowledgedUserCount}/
                {detail.tenantUserTotal})
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">
                  {detail.isAcknowledgementRequired
                    ? t("policies.badgeMandatory")
                    : t("policies.badgeRecommended")}
                </Badge>
                {!detail.myAcknowledgedAt && detail.isAcknowledgementRequired ? (
                  <Badge variant="warning">{t("policies.pending")}</Badge>
                ) : detail.myAcknowledgedAt ? (
                  <Badge variant="success">{t("policies.acknowledged")}</Badge>
                ) : (
                  <Badge variant="outline" className="border-amber-200 bg-amber-50">
                    {t("policies.suggestedUnread")}
                  </Badge>
                )}
              </div>
              {detail.fileUrl ? (
                <Button type="button" variant="outline" size="sm" className="gap-2" asChild>
                  <Link href={detail.fileUrl} target="_blank" rel="noopener noreferrer">
                    <Download className="h-4 w-4" aria-hidden />
                    {t("policies.actionDownload")}
                  </Link>
                </Button>
              ) : null}
              <div className="whitespace-pre-wrap rounded-lg border border-slate-100 bg-white p-4 text-sm leading-relaxed text-slate-900 shadow-inner">
                {detail.content}
              </div>
              {!detail.myAcknowledgedAt ? (
                <Button
                  type="button"
                  variant="success"
                  onClick={() => detailId && void acknowledge(detailId)}
                  disabled={ackBusy !== null}
                >
                  {t("policies.confirmReadUnderstand")}
                </Button>
              ) : (
                <p className="text-xs text-slate-500">
                  {t("policies.youAckedOn")}{" "}
                  {detail.myAcknowledgedAt
                    ? new Date(detail.myAcknowledgedAt).toLocaleString(localeTag)
                    : ""}
                  .
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
                <li key={`${r.userId}-${r.acknowledgedAt}`} className="rounded-lg border border-slate-100 px-3 py-2">
                  <span className="font-medium">
                    {r.user.firstName} {r.user.lastName}
                  </span>{" "}
                  <span className="text-slate-500">({r.user.email})</span>
                  <div className="text-xs text-slate-500">{new Date(r.acknowledgedAt).toLocaleString(localeTag)}</div>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
