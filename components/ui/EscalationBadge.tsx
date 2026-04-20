import { Info, AlertTriangle, AlertOctagon } from "lucide-react";
import { cn } from "@/lib/utils";

const levelConfig = {
  1: {
    label: "Seviye 1",
    sub: "Takipte",
    icon: Info,
    className: "border-emerald-200 bg-emerald-50 text-emerald-900",
    iconClass: "text-brand-emerald",
  },
  2: {
    label: "Seviye 2",
    sub: "Dikkat",
    icon: AlertTriangle,
    className: "border-amber-200 bg-amber-50 text-amber-950",
    iconClass: "text-brand-amber",
  },
  3: {
    label: "Seviye 3",
    sub: "Kritik",
    icon: AlertOctagon,
    className: "border-rose-200 bg-rose-50 text-rose-950",
    iconClass: "text-brand-rose",
  },
} as const;

export type EscalationBadgeLevel = 1 | 2 | 3;

export function EscalationBadge(props: {
  level: EscalationBadgeLevel;
  className?: string;
}): JSX.Element {
  const cfg = levelConfig[props.level];
  const Icon = cfg.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-xs font-semibold uppercase tracking-wide",
        cfg.className,
        props.className
      )}
    >
      <Icon className={cn("h-3.5 w-3.5 shrink-0", cfg.iconClass)} aria-hidden />
      <span>
        {cfg.label}
        <span className="ml-1 font-normal normal-case text-current/80">· {cfg.sub}</span>
      </span>
    </span>
  );
}
