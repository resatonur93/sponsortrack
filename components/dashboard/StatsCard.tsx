import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type StatsCardProps = {
  title: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon;
  accent?: "default" | "warning" | "danger" | "success";
  className?: string;
};

const accentMap = {
  default: {
    icon: "text-brand-navy/60",
    iconBg: "bg-brand-navy/6",
    bar: "bg-gradient-to-r from-brand-gold to-brand-gold/60",
    value: "text-brand-navy",
  },
  warning: {
    icon: "text-warning",
    iconBg: "bg-warning/8",
    bar: "bg-gradient-to-r from-warning to-warning/60",
    value: "text-warning",
  },
  danger: {
    icon: "text-danger",
    iconBg: "bg-danger/8",
    bar: "bg-gradient-to-r from-danger to-danger/60",
    value: "text-danger",
  },
  success: {
    icon: "text-success",
    iconBg: "bg-success/8",
    bar: "bg-gradient-to-r from-success to-success/60",
    value: "text-success",
  },
};

export function StatsCard({
  title,
  value,
  description,
  icon: Icon,
  accent = "default",
  className,
}: StatsCardProps): JSX.Element {
  const colors = accentMap[accent];
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border border-slate-100 bg-white px-4 py-4 shadow-stat transition-all duration-200 hover:-translate-y-0.5 hover:shadow-stat-hover",
        className
      )}
    >
      {/* Top accent bar */}
      <div className={cn("absolute inset-x-0 top-0 h-[3px]", colors.bar)} />

      <div className="flex items-start justify-between gap-3 pt-1">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
            {title}
          </p>
          <p
            className={cn(
              "mt-2.5 text-3xl font-bold tabular-nums tracking-tight",
              colors.value
            )}
          >
            {value}
          </p>
          {description ? (
            <p className="mt-1 text-[11px] leading-snug text-slate-400">
              {description}
            </p>
          ) : null}
        </div>
        {Icon ? (
          <span
            className={cn(
              "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all duration-200 group-hover:scale-110",
              colors.iconBg,
              colors.icon
            )}
          >
            <Icon className="h-[18px] w-[18px]" />
          </span>
        ) : null}
      </div>
    </div>
  );
}
