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
    <aside className="flex w-56 shrink-0 flex-col border-r border-slate-700 bg-[#0F172A]">
      <div className="border-b border-slate-700 px-4 py-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          SponsorTrack
        </p>
        <p className="text-sm font-bold text-slate-50">{t("admin.subtitle")}</p>
      </div>
      <nav className="flex-1 space-y-0.5 p-2">
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
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium",
                active
                  ? "bg-[#1E5BB5] text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {t(item.labelKey)}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
