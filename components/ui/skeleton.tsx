import * as React from "react";
import { cn } from "@/lib/utils";

/** Pulse placeholder; use for loading layouts and list shells. */
function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): JSX.Element {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-slate-200/90", className)}
      {...props}
    />
  );
}

export { Skeleton };
