"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { LogOut, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useTranslation } from "@/contexts/LanguageContext";

export function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  const { data } = useSession();
  const { t } = useTranslation();

  return (
    <div className="surface-page flex min-h-screen">
      <a href="#main-content-admin" className="skip-nav--dark">
        {t("common.skipToContent")}
      </a>
      <AdminSidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b border-slate-200/90 bg-white px-4 shadow-sm">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-navy transition-colors hover:text-brand-gold"
            >
              <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
              {t("shell.app")}
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher variant="light" />
            <span className="hidden max-w-[220px] truncate text-xs font-medium text-slate-700 sm:inline">
              {data?.user?.email}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-slate-300 text-slate-800 hover:border-brand-navy/30 hover:bg-slate-50"
              onClick={() =>
                void signOut({
                  callbackUrl: `${window.location.origin}/login`,
                })
              }
            >
              <LogOut className="mr-1 h-4 w-4 shrink-0" aria-hidden />
              {t("shell.logout")}
            </Button>
          </div>
        </header>
        <main
          id="main-content-admin"
          className="flex-1 scroll-mt-14 overflow-auto bg-brand-surface p-4 md:p-8"
          tabIndex={-1}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
