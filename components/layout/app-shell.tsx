"use client";

import Link from "next/link";
import { Logo } from "@/components/branding/Logo";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard,
  Users,
  BellRing,
  LogOut,
  Shield,
  UserCog,
  CalendarClock,
  TriangleAlert,
  Building2,
  LayoutPanelLeft,
  Gauge,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AlertCountPill } from "@/components/layout/AlertCountPill";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useTranslation } from "@/contexts/LanguageContext";

const navBase = [
  { href: "/dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard },
  { href: "/workers", labelKey: "nav.workers", icon: Users },
  { href: "/events", labelKey: "nav.events", icon: CalendarClock },
  { href: "/alerts", labelKey: "nav.alerts", icon: TriangleAlert },
  { href: "/notifications", labelKey: "nav.notifications", icon: BellRing },
  { href: "/policies", labelKey: "nav.policies", icon: BookOpen },
  { href: "/compliance", labelKey: "nav.compliance", icon: Shield },
  { href: "/audit", labelKey: "nav.audit", icon: LayoutPanelLeft },
  { href: "/risk-report", labelKey: "nav.riskReport", icon: Gauge },
  {
    href: "/organisation-changes",
    labelKey: "nav.orgChanges",
    icon: Building2,
  },
] as const;

const adminNavItem = {
  href: "/admin",
  labelKey: "nav.admin",
  icon: UserCog,
} as const;

export function AppShell({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  const pathname = usePathname();
  const { data } = useSession();
  const { t } = useTranslation();
  const nav = data?.user?.canAccessAdminPanel
    ? [...navBase, adminNavItem]
    : [...navBase];

  return (
    <div className="surface-page flex min-h-screen">
      <a href="#main-content" className="skip-nav">
        {t("common.skipToContent")}
      </a>
      <aside className="hidden min-h-screen w-56 flex-shrink-0 flex-col border-r border-brand-navy/12 bg-white shadow-[2px_0_24px_-12px_rgba(10,42,94,0.08)] md:flex">
        <div className="flex h-[4.25rem] items-center border-b border-brand-navy/10 bg-white px-3">
          <Logo href="/dashboard" mark="compact" variant="light" size="sm" />
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {nav.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-brand-navy text-white shadow-sm"
                    : "text-brand-navy/90 hover:bg-brand-gold/12 hover:text-brand-navy"
                )}
              >
                <Icon className="h-4 w-4 shrink-0 opacity-95" />
                <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
                  <span className="truncate">{t(item.labelKey)}</span>
                  {item.href === "/alerts" ? <AlertCountPill /> : null}
                </span>
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-brand-navy/10 bg-brand-surface/50 p-3">
          <p className="truncate text-xs font-medium text-slate-700">{data?.user?.email}</p>
          <Button
            variant="outline"
            className="mt-2 w-full"
            type="button"
            onClick={() =>
              void signOut({
                callbackUrl: `${window.location.origin}/login`,
              })
            }
          >
            <LogOut className="mr-2 h-4 w-4" />
            {t("shell.logout")}
          </Button>
        </div>
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-40 border-b border-brand-navy/10 bg-white/95 px-4 py-3 shadow-sm backdrop-blur-sm md:hidden">
          <div className="flex h-11 items-center justify-between gap-2">
            <Logo href="/dashboard" mark="compact" variant="light" size="sm" />
            <LanguageSwitcher />
          </div>
          <nav className="mt-2 flex gap-2 overflow-x-auto pb-1 text-sm">
            {nav.map((item) => {
              const Icon = item.icon;
              const active =
                pathname === item.href ||
                pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex shrink-0 items-center gap-1 rounded-lg px-3 py-1.5 font-medium transition-colors",
                    active
                      ? "bg-brand-navy text-white shadow-sm"
                      : "bg-brand-surface text-brand-navy hover:bg-brand-gold/15"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex items-center gap-1">
                    {t(item.labelKey)}
                    {item.href === "/alerts" ? <AlertCountPill /> : null}
                  </span>
                </Link>
              );
            })}
          </nav>
        </header>
        <div className="hidden items-center justify-end border-b border-brand-navy/10 bg-white/90 px-4 py-2.5 shadow-sm backdrop-blur-sm md:flex">
          <LanguageSwitcher />
        </div>
        <main
          id="main-content"
          className="flex-1 scroll-mt-16 bg-brand-surface p-4 md:p-8"
          tabIndex={-1}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
