"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Link2,
  Lock,
  SlidersHorizontal,
  Sparkles,
  CreditCard,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminPageHeader, AdminSurfaceCard } from "@/components/admin/shell/AdminPageShell";
import { useTranslation } from "@/contexts/LanguageContext";
import type { LucideIcon } from "lucide-react";

const categories: readonly {
  icon: LucideIcon;
  titleKey: string;
  descKey: string;
}[] = [
  { icon: SlidersHorizontal, titleKey: "admin.settings.cat.leadForms", descKey: "admin.settings.cat.leadFormsDesc" },
  { icon: Bell, titleKey: "admin.settings.cat.notifications", descKey: "admin.settings.cat.notificationsDesc" },
  { icon: Lock, titleKey: "admin.settings.cat.security", descKey: "admin.settings.cat.securityDesc" },
  { icon: CreditCard, titleKey: "admin.settings.cat.license", descKey: "admin.settings.cat.licenseDesc" },
  { icon: Link2, titleKey: "admin.settings.cat.integrations", descKey: "admin.settings.cat.integrationsDesc" },
] as const;

export default function AdminSettingsPage(): JSX.Element {
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

  return (
    <div className="mx-auto max-w-6xl space-y-10 pb-12">
      <AdminPageHeader title={t("admin.settings.title")} subtitle={t("admin.settings.subtitle")} />

      <AdminSurfaceCard className="relative overflow-hidden p-8 md:p-10">
        <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-amber-200/30 blur-3xl" aria-hidden />
        <div className="relative flex flex-col items-center gap-4 text-center md:flex-row md:items-start md:text-left">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-brand-navy/10 text-brand-navy ring-2 ring-brand-navy/10">
            <Sparkles className="h-8 w-8" aria-hidden strokeWidth={1.75} />
          </div>
          <div className="max-w-2xl space-y-2">
            <h2 className="text-xl font-bold text-brand-navy">{t("admin.settings.soonRibbon")}</h2>
            <p className="text-sm leading-relaxed text-brand-slate">{t("admin.settings.subtitle")}</p>
          </div>
          <Badge
            variant="outline"
            className="mx-auto shrink-0 border-amber-300/90 bg-amber-50 px-4 py-1 text-xs font-bold uppercase tracking-wide text-amber-950 md:ml-auto"
          >
            {t("admin.settings.soonRibbon")}
          </Badge>
        </div>
      </AdminSurfaceCard>

      <section>
        <p className="mb-6 text-xs font-bold uppercase tracking-[0.14em] text-brand-slate">{t("admin.settings.plannedHeading")}</p>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {categories.map((c) => {
            const Icon = c.icon;
            return (
              <Card
                key={c.titleKey}
                className="group border-brand-navy/12 bg-white shadow-md ring-1 ring-brand-navy/5 transition hover:border-brand-navy/25 hover:shadow-lg"
              >
                <CardHeader className="space-y-3 pb-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-navy/[0.08] text-brand-navy ring-1 ring-brand-navy/10 transition group-hover:bg-brand-navy/[0.12]">
                      <Icon className="h-5 w-5" strokeWidth={2} aria-hidden />
                    </div>
                    <Badge
                      variant="outline"
                      className="border-amber-300/80 bg-amber-50 text-[10px] font-bold uppercase tracking-wide text-amber-950"
                    >
                      {t("admin.settings.soonRibbon")}
                    </Badge>
                  </div>
                  <CardTitle className="text-base">{t(c.titleKey)}</CardTitle>
                  <CardDescription className="text-sm leading-relaxed">{t(c.descKey)}</CardDescription>
                </CardHeader>
                <CardContent className="pt-0 pb-6">
                  <div className="h-px w-full bg-gradient-to-r from-transparent via-brand-navy/12 to-transparent" />
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}