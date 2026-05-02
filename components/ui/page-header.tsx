import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type PageHeaderProps = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
};

/** Shared page title row for tenant app and admin (use inside main content). */
function PageHeader({ title, subtitle, actions, className }: PageHeaderProps): JSX.Element {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 border-b border-brand-navy/10 pb-6 md:flex-row md:items-start md:justify-between",
        className
      )}
    >
      <div className="space-y-2">
        <h1 className="page-title">{title}</h1>
        {subtitle ? <p className="page-subtitle">{subtitle}</p> : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}

export { PageHeader };
