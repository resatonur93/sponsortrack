"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

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

export function AdminPageHeader(props: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
}): JSX.Element {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 border-b border-brand-navy/10 pb-6 md:flex-row md:items-start md:justify-between",
        props.className
      )}
    >
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-brand-navy md:text-3xl">{props.title}</h1>
        {props.subtitle ? (
          <p className="max-w-3xl text-sm leading-relaxed text-brand-slate">{props.subtitle}</p>
        ) : null}
      </div>
      {props.actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{props.actions}</div>
      ) : null}
    </div>
  );
}

export function AdminEmptyState(props: {
  icon: ReactNode;
  title: string;
  description?: string;
  primaryAction?: ReactNode;
  secondaryAction?: ReactNode;
}): JSX.Element {
  return (
    <AdminSurfaceCard>
      <div className="flex flex-col items-center justify-center px-6 py-16 text-center md:py-20">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-navy/[0.08] text-brand-navy ring-2 ring-brand-navy/[0.12] [&>svg]:h-8 [&>svg]:w-8">
          {props.icon}
        </div>
        <h2 className="text-lg font-bold text-brand-navy md:text-xl">{props.title}</h2>
        {props.description ? (
          <p className="mt-3 max-w-md text-sm leading-relaxed text-brand-slate">{props.description}</p>
        ) : null}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          {props.primaryAction}
          {props.secondaryAction}
        </div>
      </div>
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
        <div className="border-b border-brand-navy/10 bg-gradient-to-r from-brand-navy/[0.06] via-white to-sky-50/30 px-5 py-3.5">
          <h2 className="text-sm font-bold uppercase tracking-[0.08em] text-brand-navy">{props.title}</h2>
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
