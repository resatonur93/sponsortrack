"use client";

import Link from "next/link";
import { FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslation } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

export function WorkerDocumentsVaultBanner({
  workerId,
}: {
  workerId: string;
}): JSX.Element {
  const { t } = useTranslation();
  const href = `/workers/${workerId}/documents`;
  const tooltip = t("workerDetail.docsVaultTooltip");
  const ctaAria = t("workerDetail.docsVaultCtaAria");

  return (
    <Card
      className={cn(
        "overflow-hidden border border-slate-200/95 bg-white shadow-sm",
        "ring-1 ring-slate-900/[0.04]"
      )}
      aria-labelledby={`vault-banner-title-${workerId}`}
    >
      <CardContent className="p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
          <div className="min-w-0 max-w-xl space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              {t("workerDetail.docsVaultEyebrow")}
            </p>
            <div>
              <h3
                id={`vault-banner-title-${workerId}`}
                className="text-lg font-semibold tracking-tight text-brand-navy sm:text-xl"
              >
                {t("workerDetail.docsVaultTitle")}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {t("workerDetail.docsVaultHint")}
              </p>
            </div>
          </div>

          <div className="shrink-0 lg:pt-1">
            <Button
              asChild
              size="default"
              variant="default"
              className={cn(
                "h-11 min-h-[2.75rem] w-full justify-center px-7 text-sm font-semibold shadow-sm",
                "sm:w-auto sm:justify-center lg:min-w-[15.5rem]",
                "transition-all duration-200 hover:bg-brand-navy hover:shadow-md hover:brightness-[1.02]",
                "active:scale-[0.99]",
                "focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2"
              )}
            >
              <Link href={href} title={tooltip} aria-label={ctaAria}>
                <FolderOpen className="mr-2 h-4 w-4 shrink-0 opacity-95" aria-hidden />
                <span>{t("workerDetail.docsVaultBtn")}</span>
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
