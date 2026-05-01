"use client";

import Image from "next/image";
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
    <aside className="flex w-56 shrink-0 flex-col border-r border-brand-navy/30 bg-brand-navy">
      <div className="border-b border-white/10 px-4 py-4">
        <Link
          href="/admin"
          className="mb-3 flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold rounded"
        >
          <Image
            src="/brand/logo-dark.svg"
            alt="Sponsor Track Admin"
            width={200}
            height={40}
            className="h-10 w-[180px] object-contain object-left"
          />
        </Link>
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-gold/90">
          {t("admin.subtitle")}
        </p>
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
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-brand-gold text-brand-navy shadow-md"
                  : "text-brand-surface/92 hover:bg-white/10 hover:text-white"
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
