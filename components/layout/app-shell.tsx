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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navBase = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/workers", label: "Çalışanlar", icon: Users },
  { href: "/notifications", label: "Bildirimler", icon: BellRing },
  { href: "/compliance", label: "Uyum / Audit", icon: Shield },
] as const;

const adminNavItem = {
  href: "/admin",
  label: "Admin panel",
  icon: UserCog,
} as const;

export function AppShell({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  const pathname = usePathname();
  const { data } = useSession();
  const nav = data?.user?.canAccessAdminPanel
    ? [...navBase, adminNavItem]
    : [...navBase];

  return (
    <div className="flex min-h-screen">
      <aside className="hidden min-h-screen w-56 flex-shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
        <div className="flex h-16 items-center border-b border-slate-200 px-4">
          <Logo href="/dashboard" size="md" variant="light" />
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium",
                  active
                    ? "bg-brand-navy text-white"
                    : "text-slate-700 hover:bg-slate-100"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-slate-200 p-3">
          <p className="truncate text-xs text-slate-500">
            {data?.user?.email}
          </p>
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
            Çıkış
          </Button>
        </div>
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="border-b border-slate-200 bg-white px-4 py-2 md:hidden">
          <div className="flex h-10 items-center justify-between">
            <Logo href="/dashboard" size="sm" variant="light" />
          </div>
          <nav className="flex gap-2 overflow-x-auto pb-2 text-sm">
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
                    "flex shrink-0 items-center gap-1 rounded-md px-2 py-1",
                    active ? "bg-brand-navy text-white" : "bg-slate-100"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </header>
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
