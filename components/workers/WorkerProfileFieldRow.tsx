import { cn } from "@/lib/utils";

export function WorkerProfileFieldRow(props: {
  label: string;
  value: string;
  mono?: boolean;
  className?: string;
}): JSX.Element {
  return (
    <div className={cn("space-y-0.5", props.className)}>
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
        {props.label}
      </p>
      <p
        className={cn(
          "text-sm leading-snug text-slate-900",
          props.mono && "font-mono text-[13px]"
        )}
      >
        {props.value}
      </p>
    </div>
  );
}
