"use client";

import type { Role } from "@prisma/client";
import { cn } from "@/lib/utils";

const badgeClass: Record<Role, string> = {
  AUTHORISING_OFFICER:
    "border-brand-navy/40 bg-brand-navy/90 text-white shadow-sm",
  SYSTEM_ADMIN: "border-violet-400 bg-violet-600 text-white shadow-sm",
  LEVEL_1_USER: "border-sky-400 bg-sky-50 text-sky-950",
  LEVEL_2_USER: "border-slate-400 bg-slate-100 text-slate-900",
};

export function AdminRoleBadge(props: {
  role: Role;
  label: string;
}): JSX.Element {
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide",
        badgeClass[props.role]
      )}
    >
      {props.label}
    </span>
  );
}
