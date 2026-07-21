"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { DocumentType } from "@prisma/client";
import { useTranslation } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { folderForDocumentTypes } from "@/lib/documents/document-folder-mapping";
import { documentsPageFolderQuery } from "@/lib/notifications/notification-vault-folder";

export type MissingDoc = {
  slotId?: string;
  documentType: string;
  label: string;
  urgency: "HIGH" | "MEDIUM" | "LOW";
  reason: string;
};

export function MissingDocumentsAlert(props: {
  items: MissingDoc[];
  workerId: string;
}): JSX.Element | null {
  const { t } = useTranslation();
  if (props.items.length === 0) return null;

  const critical = props.items.some((m) => m.urgency === "HIGH");
  const vaultBaseHref = `/workers/${props.workerId}/documents`;
  // Deep-link straight to the right folder only when there's one thing to fix — with
  // several missing items across different folders, jumping to just one would be
  // misleading, so fall back to the plain vault page.
  const vaultHref =
    props.items.length === 1
      ? `${vaultBaseHref}?${documentsPageFolderQuery(
          folderForDocumentTypes([props.items[0].documentType as DocumentType])
        )}`
      : vaultBaseHref;

  return (
    <div
      role="alert"
      className={cn(
        "rounded-xl border-2 p-4 shadow-sm",
        critical
          ? "border-red-300/95 bg-red-50/95 shadow-red-200/60"
          : "border-amber-300/90 bg-amber-50/90 shadow-amber-200/50"
      )}
    >
      <div className="flex flex-wrap items-start gap-3">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border",
            critical
              ? "border-red-200 bg-red-100 text-red-800"
              : "border-amber-200 bg-amber-100 text-amber-950"
          )}
          aria-hidden
        >
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <p className="text-sm font-bold leading-snug tracking-tight text-slate-900">
            {t("docAlert.title")}
          </p>
          <ul className="space-y-2 text-sm">
            {props.items.map((m) => (
              <li
                key={`${m.slotId ?? m.documentType}-${m.reason}`}
                className="flex flex-wrap items-baseline gap-2 rounded-md border border-black/10 bg-white/60 px-3 py-2"
              >
                <Badge
                  variant={
                    m.urgency === "HIGH"
                      ? "danger"
                      : m.urgency === "MEDIUM"
                        ? "warning"
                        : "outline"
                  }
                >
                  {m.urgency}
                </Badge>
                <span className="font-medium text-slate-900">{m.label}</span>
                <span className="text-xs text-slate-600">({m.reason})</span>
              </li>
            ))}
          </ul>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <Button size="sm" variant="default" className="w-fit shrink-0" asChild>
              <Link href={vaultHref} aria-label={t("workerDetail.docsVaultCtaAria")}>
                {t("workerDetail.docsVaultBtn")}
              </Link>
            </Button>
            <p className="text-xs leading-relaxed text-slate-700">
              {t("docAlert.afterCta")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
