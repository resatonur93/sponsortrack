import { cn } from "@/lib/utils";

export type ComplianceStatus = "valid" | "expiring" | "expired" | "pending";

const statusMap: Record<
  ComplianceStatus,
  { label: string; dot: string; text: string }
> = {
  valid: {
    label: "Geçerli",
    dot: "bg-brand-emerald",
    text: "text-brand-emerald",
  },
  expiring: {
    label: "Süresi dolmak üzere",
    dot: "bg-brand-amber",
    text: "text-brand-amber",
  },
  expired: {
    label: "Süresi dolmuş",
    dot: "bg-brand-rose",
    text: "text-brand-rose",
  },
  pending: {
    label: "Beklemede",
    dot: "bg-brand-slate",
    text: "text-brand-slate",
  },
};

export function StatusIndicator(props: {
  status: ComplianceStatus;
  className?: string;
}): JSX.Element {
  const s = statusMap[props.status];
  return (
    <span
      className={cn("inline-flex items-center gap-2 text-sm font-medium", props.className)}
    >
      <span
        className={cn("h-2 w-2 shrink-0 rounded-full ring-2 ring-white", s.dot)}
        aria-hidden
      />
      <span className={s.text}>{s.label}</span>
    </span>
  );
}
