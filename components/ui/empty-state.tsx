import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

export type EmptyStateProps = {
  icon: ReactNode;
  title: string;
  description?: string;
  primaryAction?: ReactNode;
  secondaryAction?: ReactNode;
  /** When false, render inner panel only (e.g. inside AdminSurfaceCard). */
  framed?: boolean;
  className?: string;
};

function EmptyStateInner({
  icon,
  title,
  description,
  primaryAction,
  secondaryAction,
}: Omit<EmptyStateProps, "framed" | "className">): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center md:py-16">
      <div
        className={cn(
          "mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-navy/[0.08] text-brand-navy ring-2 ring-brand-navy/[0.1]",
          "[&>svg]:h-7 [&>svg]:w-7"
        )}
      >
        {icon}
      </div>
      <h2 className="text-lg font-semibold text-brand-navy md:text-xl">{title}</h2>
      {description ? (
        <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-600">{description}</p>
      ) : null}
      {(primaryAction || secondaryAction) && (
        <div className="mt-7 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
          {primaryAction}
          {secondaryAction}
        </div>
      )}
    </div>
  );
}

function EmptyState({
  framed = true,
  className,
  ...inner
}: EmptyStateProps): JSX.Element {
  if (!framed) {
    return (
      <div className={cn(className)}>
        <EmptyStateInner {...inner} />
      </div>
    );
  }
  return (
    <Card className={cn("overflow-hidden border-brand-navy/10 shadow-card", className)}>
      <CardContent className="p-0">
        <EmptyStateInner {...inner} />
      </CardContent>
    </Card>
  );
}

export { EmptyState };
