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
    <div className="flex min-h-screen bg-brand-surface text-slate-900">
      <a href="#main-content-admin" className="skip-nav--dark">
        {t("common.skipToContent")}
      </a>
      <AdminSidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b border-brand-navy/12 bg-white px-4 shadow-sm">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1 text-sm font-medium text-brand-navy/80 transition-colors hover:text-brand-gold"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("shell.app")}
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher variant="light" />
            <span className="hidden max-w-[200px] truncate text-xs text-brand-slate sm:inline">
              {data?.user?.email}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                void signOut({
                  callbackUrl: `${window.location.origin}/login`,
                })
              }
            >
              <LogOut className="mr-1 h-4 w-4" />
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
