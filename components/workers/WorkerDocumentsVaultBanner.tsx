"use client";

import Link from "next/link";
import { ArrowRight, FolderOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslation } from "@/contexts/LanguageContext";

export function WorkerDocumentsVaultBanner({
  workerId,
}: {
  workerId: string;
}): JSX.Element {
  const { t } = useTranslation();
  const href = `/workers/${workerId}/documents`;
  const tooltip = t("workerDetail.docsVaultTooltip");

  return (
    <Card
      className="overflow-hidden border-2 border-brand-navy/25 bg-gradient-to-br from-brand-navy/[0.12] via-white to-brand-surface shadow-lg shadow-brand-navy/10"
      aria-labelledby={`vault-banner-title-${workerId}`}
    >
      <CardContent className="p-6 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
          <div className="max-w-xl space-y-3">
            <Badge
              variant="default"
              className="w-fit border border-white/40 bg-brand-navy text-[11px] tracking-wide shadow-sm"
            >
              {t("workerDetail.docsVaultEyebrow")}
            </Badge>
            <div>
              <h3
                id={`vault-banner-title-${workerId}`}
                className="text-xl font-semibold tracking-tight text-brand-navy sm:text-2xl"
              >
                {t("workerDetail.docsVaultTitle")}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-700">
                {t("workerDetail.docsVaultHint")}
              </p>
            </div>
          </div>
          <Button
            asChild
            size="lg"
            variant="default"
            className="h-14 w-full shrink-0 gap-3 px-8 text-base font-semibold shadow-md ring-2 ring-brand-gold/30 ring-offset-2 ring-offset-white hover:ring-brand-gold/50 lg:h-16 lg:min-w-[17rem]"
          >
            <Link
              href={href}
              title={tooltip}
              aria-label={t("workerDetail.docsVaultCtaAria")}
            >
              <FolderOpen className="h-5 w-5 shrink-0 opacity-95" aria-hidden />
              <span>{t("workerDetail.docsVaultBtn")}</span>
              <ArrowRight className="h-5 w-5 shrink-0 opacity-95" aria-hidden />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
