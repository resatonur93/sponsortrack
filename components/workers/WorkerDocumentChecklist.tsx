"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { DocumentType } from "@prisma/client";
import { Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/contexts/LanguageContext";
import { folderForDocumentTypes } from "@/lib/documents/document-folder-mapping";
import { documentsPageFolderQuery } from "@/lib/notifications/notification-vault-folder";

type ChecklistItem = {
  slotId: string;
  documentType: DocumentType;
  documentTypesAccepted: DocumentType[];
  label: string;
  description: string;
  isMandatory?: boolean;
  deadlineDays?: number | null;
  status: "ok" | "missing" | "expired" | "expiring_soon";
  urgency: "HIGH" | "MEDIUM" | "LOW" | null;
  latest: {
    id: string;
    fileName: string;
    uploadDate: string;
    expiryDate: string | null;
  } | null;
};

function statusBadgeVariant(
  s: ChecklistItem["status"]
): "success" | "danger" | "warning" | "outline" {
  switch (s) {
    case "ok":
      return "success";
    case "missing":
      return "danger";
    case "expired":
      return "danger";
    case "expiring_soon":
      return "warning";
    default:
      return "outline";
  }
}

function itemSurfaceClass(status: ChecklistItem["status"]): string {
  switch (status) {
    case "missing":
      return "border-red-200/85 bg-red-50/95";
    case "expired":
      return "border-red-300/85 bg-red-50/92";
    case "expiring_soon":
      return "border-amber-200/90 bg-amber-50/88";
    default:
      return "border-emerald-200/70 bg-emerald-50/50";
  }
}

function accentBarClass(status: ChecklistItem["status"]): string {
  switch (status) {
    case "missing":
    case "expired":
      return "bg-red-600";
    case "expiring_soon":
      return "bg-amber-500";
    default:
      return "bg-emerald-600";
  }
}

type Props = {
  workerId: string;
  /** Increment or change after uploads to refetch checklist. */
  refreshKey?: number;
};

export function WorkerDocumentChecklist(props: Props): JSX.Element {
  const { t, locale } = useTranslation();
  const localeTag = locale === "tr" ? "tr-TR" : "en-GB";
  const vaultBaseHref = `/workers/${props.workerId}/documents`;

  const statusLabel: Record<ChecklistItem["status"], string> = {
    ok: t("docChecklist.uploaded"),
    missing: t("docChecklist.missing"),
    expired: t("docChecklist.expired"),
    expiring_soon: t("docChecklist.expiringSoon"),
  };

  const [items, setItems] = useState<ChecklistItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    const res = await fetch(`/api/workers/${props.workerId}/missing-documents`, {
      credentials: "include",
      cache: "no-store",
    });
    setLoading(false);
    if (!res.ok) {
      setError(t("docChecklist.error"));
      setItems(null);
      return;
    }
    const json = (await res.json()) as { data: { checklist: ChecklistItem[] } };
    setItems(json.data.checklist ?? []);
    setError(null);
  }, [props.workerId, t]);

  useEffect(() => {
    void load();
  }, [load, props.refreshKey]);

  const sorted = useMemo(() => {
    if (!items?.length) return [];
    const w = { missing: 0, expired: 1, expiring_soon: 2, ok: 3 };
    return [...items].sort((a, b) => w[a.status] - w[b.status]);
  }, [items]);

  if (loading && items === null) {
    return (
      <Card className="border-brand-navy/20 shadow-sm">
        <CardContent className="py-8 text-sm text-slate-500">
          {t("docChecklist.loading")}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 shadow-sm">
        <CardContent className="py-4 text-sm text-red-700">{error}</CardContent>
      </Card>
    );
  }

  if (!items || items.length === 0) {
    return (
      <Card className="border-brand-navy/15 bg-brand-surface/90 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-brand-navy">
            {t("docChecklist.titleEmpty")}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-600">{t("docChecklist.noRules")}</CardContent>
      </Card>
    );
  }

  const okCount = items.filter((i) => i.status === "ok").length;
  const total = items.length;
  const pct =
    total > 0 ? Math.min(100, Math.round((okCount / total) * 100)) : 0;
  const barTone =
    pct === 100
      ? "from-emerald-600 to-teal-500"
      : pct >= 50
        ? "from-amber-500 to-amber-400"
        : "from-red-600 to-orange-500";

  const attention = sorted.filter((i) => i.status !== "ok");
  const completed = sorted.filter((i) => i.status === "ok");

  return (
    <Card className="border border-slate-200/95 bg-white shadow-sm ring-1 ring-slate-900/[0.03]">
      <CardHeader className="border-b border-slate-100 bg-white px-5 py-6 sm:px-6">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
            <div className="min-w-0 space-y-2 pr-2">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <CardTitle className="text-base font-semibold leading-snug text-brand-navy sm:text-lg">
                  {t("docChecklist.title")}
                </CardTitle>
                <Badge
                  variant="outline"
                  className="border-slate-200 text-[10px] font-semibold uppercase tracking-wide text-slate-600"
                >
                  {t("docChecklist.appendix")}
                </Badge>
              </div>
              <p className="max-w-prose text-sm leading-relaxed text-slate-600">
                {t("docChecklist.hint")}
              </p>
            </div>
            <div className="shrink-0 text-left sm:w-52 sm:text-right">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                {t("docChecklist.completionStatLabel")}
              </p>
              <p className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1 sm:justify-end">
                <span className="tabular-nums text-xl font-semibold text-brand-navy sm:text-2xl">
                  {t("docChecklist.progressOf")
                    .replace("{done}", String(okCount))
                    .replace("{total}", String(total))}
                </span>
                <span className="text-sm font-medium tabular-nums text-slate-500">
                  {t("docChecklist.progress")} · {pct}%
                </span>
              </p>
            </div>
          </div>
          <div
            className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100"
            role="progressbar"
            aria-valuenow={okCount}
            aria-valuemin={0}
            aria-valuemax={total}
            aria-label={t("docChecklist.progressAria")
              .replace("{done}", String(okCount))
              .replace("{total}", String(total))}
          >
            <div
              className={cn(
                "h-full rounded-full bg-gradient-to-r transition-all duration-500 ease-out",
                barTone
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-10 px-5 py-6 sm:px-6">
        {attention.length > 0 ? (
          <section aria-label={t("docChecklist.needsAttention")}>
            <h4 className="mb-4 flex items-center gap-2 text-sm font-semibold text-red-950">
              <span className="inline-block size-2 shrink-0 rounded-full bg-red-600" aria-hidden />
              {t("docChecklist.needsAttention")}
            </h4>
            <ul className="grid gap-4 sm:grid-cols-1 xl:grid-cols-2">
              {attention.map((row) => (
                <li key={row.slotId}>
                  <DocSlotCard
                    row={row}
                    localeTag={localeTag}
                    vaultBaseHref={vaultBaseHref}
                    statusLabel={statusLabel}
                    accentBarClass={accentBarClass}
                    surfaceClass={itemSurfaceClass(row.status)}
                    t={t}
                  />
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {completed.length > 0 ? (
          <section aria-label={t("docChecklist.completeSection")}>
            <h4 className="mb-4 flex items-center gap-2 text-sm font-semibold text-emerald-900">
              <span className="inline-block size-2 shrink-0 rounded-full bg-emerald-600" aria-hidden />
              {t("docChecklist.completeSection")}
            </h4>
            <ul className="grid gap-3 sm:grid-cols-1 lg:grid-cols-2">
              {completed.map((row) => (
                <li key={row.slotId}>
                  <DocSlotCard
                    row={row}
                    localeTag={localeTag}
                    vaultBaseHref={vaultBaseHref}
                    statusLabel={statusLabel}
                    accentBarClass={accentBarClass}
                    surfaceClass={itemSurfaceClass(row.status)}
                    t={t}
                  />
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </CardContent>
    </Card>
  );
}

function DocSlotCard(props: {
  row: ChecklistItem;
  localeTag: string;
  vaultBaseHref: string;
  statusLabel: Record<ChecklistItem["status"], string>;
  accentBarClass: (s: ChecklistItem["status"]) => string;
  surfaceClass: string;
  t: (key: string, fallback?: string) => string;
}): JSX.Element {
  const {
    row,
    localeTag,
    vaultBaseHref,
    statusLabel,
    accentBarClass,
    surfaceClass,
    t,
  } = props;
  const showUpload = row.status === "missing" || row.status === "expired";
  const uploadAria = t("docChecklist.uploadNowAria").replace("{label}", row.label);
  const targetFolder = folderForDocumentTypes(row.documentTypesAccepted);
  const vaultHref = `${vaultBaseHref}?${documentsPageFolderQuery(targetFolder)}`;

  return (
    <div
      className={cn(
        "relative flex overflow-hidden rounded-lg border shadow-sm ring-1 ring-slate-900/[0.03]",
        surfaceClass
      )}
    >
      <div className={cn("w-[3px] shrink-0 self-stretch", accentBarClass(row.status))}
        aria-hidden
      />
      <div className="flex flex-1 flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-brand-navy">{row.label}</span>
            <Badge variant="outline" className="font-mono text-[10px]">
              {row.documentTypesAccepted.join(" · ")}
            </Badge>
            <Badge
              variant={statusBadgeVariant(row.status)}
              className="shadow-sm"
            >
              {statusLabel[row.status]}
            </Badge>
          </div>
          {row.description ? (
            <p className="text-sm leading-snug text-slate-700">{row.description}</p>
          ) : null}
          {row.latest ? (
            <p className="text-xs text-slate-600">
              {t("docChecklist.file")}:{" "}
              <span className="font-semibold">{row.latest.fileName}</span>
              {" · "}
              {t("docChecklist.uploadedOn")}:{" "}
              {new Date(row.latest.uploadDate).toLocaleDateString(localeTag)}
              {row.latest.expiryDate
                ? ` · ${t("docChecklist.expires")}: ${new Date(row.latest.expiryDate).toLocaleDateString(localeTag)}`
                : ` · ${t("docChecklist.noExpiry")}`}
            </p>
          ) : row.status === "missing" ? (
            <p className="text-sm font-medium text-red-900">
              {t("docChecklist.notUploadedYet")}
            </p>
          ) : null}
        </div>

        {showUpload ? (
          <div className="shrink-0 self-stretch sm:self-center">
            <Button variant="default" size="sm" className="w-full gap-2 shadow-sm sm:w-auto" asChild>
              <Link href={vaultHref} aria-label={uploadAria} title={uploadAria}>
                <Upload className="h-4 w-4 shrink-0" aria-hidden />
                {t("docChecklist.uploadNow")}
              </Link>
            </Button>
          </div>
        ) : row.status === "expiring_soon" ? (
          <div className="shrink-0 sm:self-center">
            <Button variant="secondary" size="sm" className="w-full gap-2 sm:w-auto" asChild>
              <Link href={vaultHref} aria-label={uploadAria} title={uploadAria}>
                <Upload className="h-4 w-4 shrink-0" aria-hidden />
                {t("docChecklist.uploadNow")}
              </Link>
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
