"use client";

import Link from "next/link";
import {
  BriefcaseBusiness,
  FileWarning,
  Fingerprint,
  Plane,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/contexts/LanguageContext";
import type { ComplianceCategory, TrafficLightCardData } from "@/lib/compliance/types";

const CATEGORY_ICONS: Record<ComplianceCategory, LucideIcon> = {
  visa: Plane,
  sponsorship: BriefcaseBusiness,
  rightToWork: Fingerprint,
  documents: FileWarning,
};

function pillClass(light: TrafficLightCardData["trafficLight"]): string {
  switch (light) {
    case "red":
      return "bg-red-100 text-red-700";
    case "amber":
      return "bg-amber-100 text-amber-700";
    default:
      return "bg-emerald-100 text-emerald-700";
  }
}

function iconWrapClass(light: TrafficLightCardData["trafficLight"]): string {
  switch (light) {
    case "red":
      return "bg-red-50 text-red-500";
    case "amber":
      return "bg-amber-50 text-amber-500";
    default:
      return "bg-emerald-50 text-emerald-500";
  }
}

function categoryLabelKey(id: ComplianceCategory): string {
  switch (id) {
    case "visa":
      return "dashboard.complianceTraffic.visa";
    case "sponsorship":
      return "dashboard.complianceTraffic.sponsorship";
    case "rightToWork":
      return "dashboard.complianceTraffic.rtw";
    case "documents":
      return "dashboard.complianceTraffic.documents";
  }
}

export function ComplianceCategoryCards(props: {
  categories: TrafficLightCardData[];
}): JSX.Element {
  const { t } = useTranslation();

  return (
    <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-card">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-slate-400">
        {t("dashboard.categoryCards.title")}
      </h2>
      <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 xl:grid-cols-4">
        {props.categories.map((cat) => {
          const Icon = CATEGORY_ICONS[cat.id];
          const actionCount = cat.criticalCount + cat.warningCount;
          return (
            <Link
              key={cat.id}
              href={cat.detailHref}
              className="flex flex-col gap-2 rounded-xl border border-slate-100 p-4 transition-colors hover:bg-brand-surface/60"
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full",
                    iconWrapClass(cat.trafficLight)
                  )}
                  aria-hidden
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                    pillClass(cat.trafficLight)
                  )}
                >
                  {actionCount > 0
                    ? `${actionCount} ${t("dashboard.categoryCards.actionsRequired")}`
                    : t("dashboard.categoryCards.clean")}
                </span>
              </div>
              <p className="text-sm font-semibold text-brand-navy">{t(categoryLabelKey(cat.id))}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
