"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AlertTriangle, ArrowUpRight, CheckCircle2, ClipboardList, FileStack, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AdminPageHeader,
  AdminSurfaceCard,
} from "@/components/admin/shell/AdminPageShell";
import { useTranslation } from "@/contexts/LanguageContext";

export default function AdminAuditPage(): JSX.Element {
  const { t } = useTranslation();
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") router.replace("/login");
    else if (!session?.user?.canAccessAdminPanel) router.replace("/dashboard");
  }, [status, session, router]);

  if (status === "loading" || !session) {
    return <p className="text-brand-slate">{t("common.loading")}</p>;
  }
  if (!session.user.canAccessAdminPanel) {
    return <p className="text-brand-slate">{t("common.loading")}</p>;
  }

  const checks = [
    t("admin.audit.chk1"),
    t("admin.audit.chk2"),
    t("admin.audit.chk3"),
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-10 pb-12">
      <AdminPageHeader title={t("admin.audit.title")} subtitle={t("admin.audit.subtitle")} />

      <AdminSurfaceCard className="relative overflow-hidden p-8 md:p-12">
        <div className="pointer-events-none absolute right-0 top-0 h-52 w-52 translate-x-1/4 -translate-y-1/4 rounded-full bg-brand-navy/[0.08] blur-2xl" aria-hidden />
        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-navy/15 bg-brand-navy/[0.06] px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand-navy">
              <Shield className="h-3.5 w-3.5" aria-hidden />
              {t("admin.audit.packTitle")}
            </div>
            <h2 className="text-xl font-bold text-brand-navy md:text-2xl">{t("admin.audit.packLead")}</h2>
            <p className="text-sm leading-relaxed text-brand-slate">{t("admin.audit.packSupport")}</p>
            <Button
              asChild
              size="lg"
              className="h-14 min-w-[220px] bg-brand-navy px-10 text-base font-bold shadow-xl ring-4 ring-brand-navy/15 hover:bg-brand-navy/92"
            >
              <Link href="/compliance/audit" className="gap-2">
                <FileStack className="h-5 w-5" aria-hidden />
                {t("admin.audit.packCta")}
                <ArrowUpRight className="h-5 w-5 opacity-95" aria-hidden />
              </Link>
            </Button>
          </div>
          <div className="hidden shrink-0 flex-col gap-4 rounded-2xl border border-brand-navy/12 bg-white/80 p-6 shadow-inner md:flex md:w-[280px]">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-brand-slate">Audit</p>
            <div className="flex gap-3 text-brand-navy">
              <ClipboardList className="h-10 w-10 shrink-0 opacity-70" aria-hidden />
              <p className="text-sm leading-relaxed text-brand-slate">{t("compliance.page.auditPackCta")}</p>
            </div>
          </div>
        </div>
      </AdminSurfaceCard>

      <AdminSurfaceCard className="p-8">
        <div className="flex items-center gap-2 text-brand-navy">
          <AlertTriangle className="h-6 w-6" aria-hidden />
          <h3 className="text-lg font-bold">{t("admin.audit.comingSoonTitle")}</h3>
        </div>
        <p className="mt-2 text-sm text-brand-slate">{t("admin.audit.comingSoonIntro")}</p>
        <ul className="mt-6 space-y-4">
          {checks.map((c) => (
            <li key={c} className="flex gap-3 text-sm leading-relaxed text-slate-800">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
              <span>{c}</span>
            </li>
          ))}
        </ul>
        <div className="mt-8 rounded-xl border border-dashed border-brand-navy/20 bg-brand-navy/[0.02] px-4 py-10 text-center text-sm text-brand-slate">
          {t("admin.audit.reserved")}
        </div>
      </AdminSurfaceCard>
    </div>
  );
}
