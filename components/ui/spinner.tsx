import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type SpinnerProps = {
  className?: string;
  "aria-label"?: string;
};

function Spinner({ className, "aria-label": ariaLabel }: SpinnerProps): JSX.Element {
  return (
    <Loader2
      className={cn("h-5 w-5 shrink-0 animate-spin text-brand-navy", className)}
      {...(ariaLabel
        ? { "aria-label": ariaLabel, "aria-hidden": false as const }
        : { "aria-hidden": true as const })}
    />
  );
}

export { Spinner };
