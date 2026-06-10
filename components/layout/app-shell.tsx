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
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AlertCountPill } from "@/components/layout/AlertCountPill";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useTranslation } from "@/contexts/LanguageContext";
import { useState } from "react";

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

/** The 4 routes that appear in the fixed bottom bar on mobile. */
const BOTTOM_NAV_HREFS = [
  "/dashboard",
  "/workers",
  "/alerts",
  "/notifications",
] as const;

export function AppShell({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  const pathname = usePathname();
  const { data } = useSession();
  const { t } = useTranslation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const nav = data?.user?.canAccessAdminPanel
    ? [...navBase, adminNavItem]
    : [...navBase];

  const bottomItems = nav.filter((item) =>
    (BOTTOM_NAV_HREFS as readonly string[]).includes(item.href)
  );

  return (
    <div className="surface-page flex min-h-screen">
      <a href="#main-content" className="skip-nav">
        {t("common.skipToContent")}
      </a>

      {/* ── Desktop Sidebar ── */}
      <aside
        className="hidden min-h-screen w-56 flex-shrink-0 flex-col shadow-sidebar md:flex"
        style={{
          background: "linear-gradient(180deg, #071d42 0%, #0a2a5e 40%, #0d3270 100%)",
        }}
      >
        <div className="flex h-[4.25rem] items-center border-b border-white/8 px-4">
          <Logo href="/dashboard" mark="compact" variant="dark" size="sm" />
        </div>
        <nav className="flex-1 space-y-0.5 px-2 py-3">
          {nav.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
                  active
                    ? "bg-white/12 text-white shadow-[inset_3px_0_0_#D4AF87]"
                    : "text-white/75 hover:bg-white/7 hover:text-white"
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0",
                    active ? "text-brand-gold opacity-100" : "opacity-70"
                  )}
                />
                <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
                  <span className="truncate">{t(item.labelKey)}</span>
                  {item.href === "/alerts" ? <AlertCountPill /> : null}
                </span>
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/10 px-3 py-4">
          <div className="mb-3 flex items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-gold/20 text-xs font-bold text-brand-gold">
              {data?.user?.email?.[0]?.toUpperCase() ?? "?"}
            </span>
            <p className="truncate text-xs font-medium text-white/60">
              {data?.user?.email}
            </p>
          </div>
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white/60 transition-colors hover:bg-white/8 hover:text-white"
            onClick={() =>
              void signOut({
                callbackUrl: `${window.location.origin}/login`,
              })
            }
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {t("shell.logout")}
          </button>
        </div>
      </aside>

      {/* ── Page column ── */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top header */}
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-brand-navy/10 bg-white/95 px-4 shadow-sm backdrop-blur-sm md:hidden">
          <Logo href="/dashboard" mark="compact" variant="light" size="sm" />
          <LanguageSwitcher />
        </header>

        {/* Desktop top bar */}
        <div className="hidden items-center justify-end border-b border-brand-navy/8 bg-white/80 px-6 py-2.5 shadow-[0_1px_0_rgba(10,42,94,0.06)] backdrop-blur-md md:flex">
          <LanguageSwitcher />
        </div>

        <main
          id="main-content"
          /* extra bottom padding so content isn't hidden under the mobile bottom bar */
          className="flex-1 scroll-mt-16 bg-[#f4f6fb] p-4 pb-[5.5rem] md:p-8 md:pb-8"
          tabIndex={-1}
        >
          {children}
        </main>
      </div>

      {/* ── Mobile Bottom Navigation Bar ── */}
      <nav
        aria-label={t("shell.bottomNav")}
        className="fixed inset-x-0 bottom-0 z-50 flex h-16 items-stretch border-t border-brand-navy/12 bg-white/97 shadow-[0_-4px_24px_-8px_rgba(10,42,94,0.12)] backdrop-blur-md md:hidden"
      >
        {bottomItems.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-[10px] font-medium leading-tight transition-colors",
                active ? "text-brand-navy" : "text-slate-400"
              )}
            >
              <span
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-xl transition-colors",
                  active ? "bg-brand-navy/10" : ""
                )}
              >
                <Icon
                  className={cn(
                    "h-[1.15rem] w-[1.15rem]",
                    active ? "text-brand-navy" : "text-slate-400"
                  )}
                />
              </span>
              {item.href === "/alerts" ? (
                <span className="absolute right-[calc(50%-18px)] top-1">
                  <AlertCountPill />
                </span>
              ) : null}
              <span>{t(item.labelKey)}</span>
            </Link>
          );
        })}

        {/* "More" button — opens full nav drawer */}
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label={t("shell.menu")}
          className="flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-[10px] font-medium leading-tight text-slate-400 transition-colors hover:text-brand-navy"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-xl">
            <Menu className="h-[1.15rem] w-[1.15rem]" />
          </span>
          <span>{t("shell.more")}</span>
        </button>
      </nav>

      {/* ── Mobile Full Nav Drawer (bottom sheet) ── */}
      {drawerOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
            aria-hidden
          />
          {/* Sheet panel */}
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t("shell.menu")}
            className="absolute inset-x-0 bottom-0 max-h-[88dvh] overflow-y-auto rounded-t-2xl bg-white shadow-2xl"
          >
            {/* Drag handle */}
            <div className="flex justify-center pb-1 pt-3" aria-hidden>
              <div className="h-1 w-10 rounded-full bg-slate-200" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <p className="text-sm font-semibold text-brand-navy">
                {t("shell.menu")}
              </p>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-brand-navy"
                aria-label={t("common.close")}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* All nav items */}
            <nav className="space-y-0.5 p-3">
              {nav.map((item) => {
                const Icon = item.icon;
                const active =
                  pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setDrawerOpen(false)}
                    className={cn(
                      "flex min-h-[3rem] items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors",
                      active
                        ? "bg-brand-navy text-white shadow-sm"
                        : "text-brand-navy/90 hover:bg-brand-gold/12 hover:text-brand-navy"
                    )}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
                      <span className="truncate">{t(item.labelKey)}</span>
                      {item.href === "/alerts" ? <AlertCountPill /> : null}
                    </span>
                  </Link>
                );
              })}
            </nav>

            {/* User info + logout */}
            <div className="border-t border-slate-100 px-4 pb-8 pt-4">
              <p className="mb-3 truncate text-xs text-slate-500">
                {data?.user?.email}
              </p>
              <Button
                variant="outline"
                className="w-full"
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
          </div>
        </div>
      )}
    </div>
  );
}
