"use client";

import type { AuditLogFeedItem } from "@/lib/compliance/audit-feed";
import { getAuditDisplayParts, parseAuditAction } from "@/lib/compliance/audit-feed";
import { useTranslation } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  ClipboardList,
  FileText,
  GitBranchPlus,
  PencilLine,
  ScrollText,
  Shield,
  Trash2,
  User,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

function entityIcon(entityType: string): LucideIcon {
  switch (entityType) {
    case "Worker":
      return User;
    case "Document":
      return FileText;
    case "NotificationEvent":
    case "ComplianceEvent":
      return ClipboardList;
    case "Policy":
    case "Acknowledgement":
      return ScrollText;
    case "RoleCompliance":
      return Shield;
    default:
      return ClipboardList;
  }
}

function verbIcon(verb: string): LucideIcon {
  const v = verb.toUpperCase();
  if (v === "CREATE") return GitBranchPlus;
  if (v === "DELETE") return Trash2;
  return PencilLine;
}

function verbStyles(verb: string): string {
  const v = verb.toUpperCase();
  if (v === "DELETE") return "border-rose-200 bg-rose-50 text-rose-800 ring-rose-400/25";
  if (v === "CREATE") return "border-emerald-200 bg-emerald-50 text-emerald-900 ring-emerald-400/25";
  return "border-amber-200 bg-amber-50 text-amber-950 ring-amber-400/25";
}

type Props = {
  items: AuditLogFeedItem[];
  localeTag: string;
};

export function AuditActivityFeed(props: Props): JSX.Element {
  const { items, localeTag } = props;
  const { t } = useTranslation();

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-6 py-14 text-center">
        <ScrollText className="h-9 w-9 text-brand-navy/40" aria-hidden />
        <p className="mt-4 font-semibold text-brand-navy">{t("compliance.feed.emptyTitle")}</p>
        <p className="mt-2 max-w-md text-sm text-slate-600">{t("compliance.feed.emptyHint")}</p>
      </div>
    );
  }

  return (
    <div className="relative pl-6 before:absolute before:left-[15px] before:top-2 before:h-[calc(100%-16px)] before:w-px before:bg-gradient-to-b before:from-brand-navy/20 before:via-slate-200 before:to-transparent">
      <ul className="space-y-0">
        {items.map((log) => {
          const { model, verb } = parseAuditAction(log.action);
          const parts = getAuditDisplayParts(t, log);
          const MainIcon = entityIcon(model);
          const SubIcon = verbIcon(verb);
          const dt = new Date(log.createdAt);
          const actorName = log.actor
            ? `${log.actor.firstName} ${log.actor.lastName}`
            : t("compliance.feed.actorUnknown");
          const actorEmail = log.actor?.email ?? "";

          return (
            <li key={log.id} className="relative pb-8 last:pb-0">
              <span className="absolute -left-[3px] top-1 flex h-3 w-3 rounded-full border-2 border-white bg-brand-navy shadow ring-4 ring-brand-navy/15" />
              <div className="ml-4 flex flex-wrap gap-3 rounded-xl border border-slate-100 bg-white p-4 shadow-sm ring-1 ring-slate-100 transition-shadow hover:shadow-md md:flex-nowrap">
                <span
                  className={cn(
                    "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border shadow-sm ring-2",
                    verbStyles(verb)
                  )}
                >
                  <MainIcon className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <BadgeVerb Icon={SubIcon} label={parts.verbLabel} />
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {parts.entityLabel}
                    </span>
                    {verb === "DELETE" ? (
                      <AlertTriangle className="h-3.5 w-3.5 text-rose-500" aria-hidden />
                    ) : null}
                  </div>
                  <p className="text-sm font-semibold text-brand-navy">{parts.detail}</p>
                  <p className="text-xs tabular-nums text-slate-500">
                    {dt.toLocaleString(localeTag)}{" "}
                    <span className="mx-1 text-slate-300">·</span>
                    <span className="font-medium text-slate-700">{actorName}</span>
                    {actorEmail ? (
                      <span className="text-slate-500"> ({actorEmail})</span>
                    ) : null}
                  </p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function BadgeVerb(props: { Icon: LucideIcon; label: string }): JSX.Element {
  const { Icon, label } = props;
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-slate-800">
      <Icon className="h-3 w-3 opacity-75" aria-hidden />
      {label}
    </span>
  );
}
