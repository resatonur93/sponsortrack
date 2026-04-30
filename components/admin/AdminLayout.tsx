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
    <div className="flex min-h-screen bg-[#0F172A] text-slate-50">
      <a href="#main-content-admin" className="skip-nav--dark">
        {t("common.skipToContent")}
      </a>
      <AdminSidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-slate-700 bg-[#1E293B] px-4">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("shell.app")}
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher variant="dark" />
            <span className="hidden text-xs text-slate-400 sm:inline">
              {data?.user?.email}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-slate-600 bg-transparent text-slate-200 hover:bg-slate-700 hover:text-white"
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
          className="flex-1 scroll-mt-14 overflow-auto p-4 md:p-8"
          tabIndex={-1}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
