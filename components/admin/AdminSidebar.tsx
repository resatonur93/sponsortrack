"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Building2,
  Shield,
  Settings,
  Inbox,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/branding/Logo";
import { useTranslation } from "@/contexts/LanguageContext";

const items = [
  { href: "/admin", labelKey: "admin.nav.dashboard", icon: LayoutDashboard },
  { href: "/admin/leads", labelKey: "admin.nav.leads", icon: Inbox },
  { href: "/admin/tenants", labelKey: "admin.nav.tenants", icon: Building2 },
  { href: "/admin/users", labelKey: "admin.nav.users", icon: Users },
  { href: "/admin/audit", labelKey: "admin.nav.audit", icon: Shield },
  { href: "/admin/settings", labelKey: "admin.nav.settings", icon: Settings },
] as const;

export function AdminSidebar(): JSX.Element {
  const pathname = usePathname();
  const { t } = useTranslation();

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-slate-700/80 bg-brand-navy text-slate-100">
      <div className="border-b border-white/15 px-3 py-3">
        <div className="mb-2.5">
          <Logo
            href="/admin"
            mark="compact"
            variant="dark"
            size="md"
            className="max-w-[192px]"
          />
        </div>
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-100">
          {t("admin.subtitle")}
        </p>
      </div>
      <nav className="flex-1 space-y-1 p-2.5" aria-label={t("admin.sidebar.navAria")}>
        {items.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium leading-snug transition-colors",
                active
                  ? "bg-brand-gold font-semibold text-brand-navy shadow-md ring-1 ring-black/10"
                  : "text-slate-100 hover:bg-slate-800/95 hover:text-white active:bg-slate-800"
              )}
            >
              <Icon
                className={cn(
                  "h-[18px] w-[18px] shrink-0 transition-colors",
                  active ? "text-brand-navy" : "text-slate-200 group-hover:text-white"
                )}
                strokeWidth={active ? 2.25 : 2}
                aria-hidden
              />
              <span className={cn("min-w-0 flex-1", active && "text-brand-navy")}>{t(item.labelKey)}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
