"use client";

import { useState } from "react";
import Link from "next/link";
import type { Document } from "@prisma/client";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/contexts/LanguageContext";
import { documentTypeTitleEn, documentTypeTitleTr } from "@/lib/documents/document-email-labels";
import { folderForDocumentTypes } from "@/lib/documents/document-folder-mapping";
import { documentsPageFolderQuery } from "@/lib/notifications/notification-vault-folder";

export type TimelineRow = {
  document: Document;
  display: Record<string, unknown>;
  status: "VALID" | "EXPIRING_SOON" | "EXPIRED" | "UNKNOWN";
};

function statusClass(s: TimelineRow["status"]): string {
  switch (s) {
    case "VALID":
      return "border-emerald-300/95 bg-emerald-50 shadow-sm";
    case "EXPIRING_SOON":
      return "border-amber-400/95 bg-amber-50 shadow-sm shadow-amber-100/70";
    case "EXPIRED":
      return "border-red-300/95 bg-red-50 shadow-sm shadow-red-100/70";
    default:
      return "border-slate-200 bg-white shadow-sm";
  }
}

export function DocumentCard(props: {
  row: TimelineRow;
  workerId: string;
  onUpdated: () => void;
}): JSX.Element {
  const { t, locale } = useTranslation();
  const { document: doc, display, status } = props.row;
  const [busy, setBusy] = useState(false);
  const dateTag = locale === "tr" ? "tr-TR" : "en-GB";

  const badgeVariant =
    status === "EXPIRED"
      ? "danger"
      : status === "EXPIRING_SOON"
        ? "warning"
        : "outline";

  function statusTranslation(): string {
    const key =
      status === "EXPIRING_SOON"
        ? "docCard.status.EXPIRING_SOON"
        : `docCard.status.${status}`;
    return t(key);
  }

  async function verify(): Promise<void> {
    setBusy(true);
    await fetch(`/api/documents/${doc.id}/verify`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ verificationNote: null }),
    });
    setBusy(false);
    props.onUpdated();
  }

  const entries = Object.entries(display).filter(
    ([, v]) => v !== undefined && v !== null && v !== ""
  );

  const targetFolder = folderForDocumentTypes([doc.documentType]);
  const vaultHref = `/workers/${props.workerId}/documents?${documentsPageFolderQuery(targetFolder)}`;

  return (
    <Card
      className={`h-full rounded-xl border-2 shadow-md transition-shadow hover:shadow-lg ${statusClass(status)}`}
    >
      <CardHeader className="space-y-2 pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <CardTitle className="font-mono text-sm font-semibold leading-tight tracking-tight text-brand-navy">
            {locale === "tr"
              ? documentTypeTitleTr(doc.documentType)
              : documentTypeTitleEn(doc.documentType)}
            <span className="ml-2 text-slate-500">· v{doc.version}</span>
          </CardTitle>
          <Badge variant={badgeVariant} className="shrink-0">
            {statusTranslation()}
          </Badge>
        </div>
        <p className="text-xs font-medium text-slate-700">{doc.fileName}</p>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {doc.expiryDate ? (
          <p className="text-slate-800">
            <span className="font-medium text-slate-600">{t("docCard.expires")}: </span>
            {new Date(doc.expiryDate).toLocaleDateString(dateTag)}
          </p>
        ) : null}
        {entries.length > 0 ? (
          <dl className="grid gap-1.5 rounded-lg border border-slate-100 bg-white/60 p-3 text-xs">
            {entries.map(([k, v]) => (
              <div key={k} className="flex gap-2">
                <dt className="shrink-0 text-slate-500">{k}</dt>
                <dd className="min-w-0 break-words font-medium text-slate-900">{String(v)}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-xs text-slate-500">{t("docCard.metadataEmpty")}</p>
        )}
        {doc.verifiedAt ? (
          <p className="text-xs font-medium text-emerald-900">
            {t("docCard.verified")}:{" "}
            {new Date(doc.verifiedAt).toLocaleString(dateTag)}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2 border-t border-slate-200/80 pt-3">
          {!doc.verifiedAt ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => void verify()}
            >
              {t("docCard.verify")}
            </Button>
          ) : null}
          <Button type="button" size="sm" variant="secondary" className="gap-1.5" asChild>
            <Link href={vaultHref}>
              <span>{t("docCard.manageInVault")}</span>
              <ExternalLink className="h-3.5 w-3.5 opacity-75" aria-hidden />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
