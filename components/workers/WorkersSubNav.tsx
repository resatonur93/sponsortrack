"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/contexts/LanguageContext";

const TABS = [
  { href: "/workers", labelKey: "nav.workers" },
  { href: "/vacancies", labelKey: "nav.vacancies" },
] as const;

export function WorkersSubNav(): JSX.Element {
  const { t } = useTranslation();
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 border-b border-slate-200" aria-label="Workers section tabs">
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm font-semibold transition-colors",
              active
                ? "border-brand-navy text-brand-navy"
                : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
            )}
          >
            {t(tab.labelKey)}
          </Link>
        );
      })}
    </nav>
  );
}
