"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState, type EmptyStateProps } from "@/components/ui/empty-state";

/** Consistent wrapper for admin main content panels. */
export function AdminSurfaceCard(props: { className?: string; children: ReactNode }): JSX.Element {
  return (
    <div
      className={cn(
        "rounded-2xl border border-brand-navy/12 bg-white shadow-md ring-1 ring-brand-navy/5",
        props.className
      )}
    >
      {props.children}
    </div>
  );
}

export function AdminPageHeader(props: Parameters<typeof PageHeader>[0]): JSX.Element {
  return <PageHeader {...props} />;
}

export function AdminEmptyState(props: Omit<EmptyStateProps, "framed">): JSX.Element {
  return (
    <AdminSurfaceCard>
      <EmptyState framed={false} {...props} />
    </AdminSurfaceCard>
  );
}

/** Filter row used under page header (consistent padding & border). */
export function AdminFilterBar(props: { children: ReactNode; className?: string }): JSX.Element {
  return (
    <AdminSurfaceCard className={cn("p-5", props.className)}>
      <div className="flex flex-col gap-4 md:flex-row md:flex-wrap md:items-end">{props.children}</div>
    </AdminSurfaceCard>
  );
}

/** Scroll + header strip for tables. */
export function AdminTablePanel(props: { title?: string; children: ReactNode; className?: string }): JSX.Element {
  return (
    <AdminSurfaceCard className={cn("overflow-hidden", props.className)}>
      {props.title ? (
        <div className="border-b border-brand-navy/10 bg-gradient-to-r from-brand-navy/[0.06] via-white to-slate-50/80 px-5 py-3.5">
          <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-brand-navy">
            {props.title}
          </h2>
        </div>
      ) : null}
      <div className="overflow-x-auto">{props.children}</div>
    </AdminSurfaceCard>
  );
}

export function initialsFromName(first?: string | null, last?: string | null, fallback?: string): string {
  const a = first?.trim().charAt(0) ?? "";
  const b = last?.trim().charAt(0) ?? "";
  const s = `${a}${b}`.toUpperCase();
  if (s) return s;
  const fb = fallback?.trim().charAt(0);
  return fb ? fb.toUpperCase() : "?";
}
