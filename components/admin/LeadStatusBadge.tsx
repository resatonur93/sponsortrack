import type { LeadStatus } from "@prisma/client";
import { cn } from "@/lib/utils";

const styles: Record<LeadStatus, string> = {
  NEW: "bg-slate-600 text-white",
  CONTACTED: "bg-blue-900/80 text-blue-100",
  QUALIFIED: "bg-indigo-900/80 text-indigo-100",
  DEMO_SCHEDULED: "bg-amber-900/80 text-amber-100",
  CONVERTED: "bg-emerald-900/80 text-emerald-100",
  LOST: "bg-rose-900/80 text-rose-100",
};

export function LeadStatusBadge(props: { status: LeadStatus }): JSX.Element {
  return (
    <span
      className={cn(
        "inline-flex rounded px-2 py-0.5 text-xs font-semibold",
        styles[props.status]
      )}
    >
      {props.status}
    </span>
  );
}
