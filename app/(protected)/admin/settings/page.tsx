"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Bell,
  CreditCard,
  Link2,
  Loader2,
  Mail,
  Shield,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LeadFormSettingsPanel } from "@/components/admin/settings/LeadFormSettingsPanel";
import { NotificationSettingsPanel } from "@/components/admin/settings/NotificationSettingsPanel";
import { SecuritySettingsPanel } from "@/components/admin/settings/SecuritySettingsPanel";
import { AdminPageHeader, AdminSurfaceCard } from "@/components/admin/shell/AdminPageShell";
import { useTranslation } from "@/contexts/LanguageContext";
import type { LucideIcon } from "lucide-react";

const categories: readonly {
  icon: LucideIcon;
  titleKey: string;
  descKey: string;
}[] = [
  { icon: Bell, titleKey: "admin.settings.cat.notifications", descKey: "admin.settings.cat.notificationsDesc" },
  { icon: CreditCard, titleKey: "admin.settings.cat.license", descKey: "admin.settings.cat.licenseDesc" },
  { icon: Link2, titleKey: "admin.settings.cat.integrations", descKey: "admin.settings.cat.integrationsDesc" },
] as const;

export default function AdminSettingsPage(): JSX.Element {
  const { t } = useTranslation();
  const { data: session, status } = useSession();
  const router = useRouter();

  const [settingsTab, setSettingsTab] = useState<
    "general" | "leadForms" | "notifications" | "security"
  >("general");

  const [smtpTo, setSmtpTo] = useState("");
  const [smtpBusy, setSmtpBusy] = useState(false);
  const [smtpMessage, setSmtpMessage] = useState<{
    variant: "ok" | "err";
    text: string;
  } | null>(null);

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

  async function sendSmtpTest(): Promise<void> {
    setSmtpBusy(true);
    setSmtpMessage(null);
    try {
      const res = await fetch("/api/admin/test-smtp", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(smtpTo.trim() ? { to: smtpTo.trim() } : {}),
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        to?: string;
        code?: string;
      };
      if (res.ok && json.ok) {
        setSmtpMessage({
          variant: "ok",
          text: `${t("admin.settings.smtpTestSuccess")} ${json.to ?? smtpTo.trim()}`,
        });
      } else {
        const detail =
          [json.error, json.code ? `(${json.code})` : ""].filter(Boolean).join(" ");
        setSmtpMessage({
          variant: "err",
          text: `${t("admin.settings.smtpTestFailed")} ${detail || res.statusText}`,
        });
      }
    } catch {
      setSmtpMessage({ variant: "err", text: t("admin.settings.smtpTestNetwork") });
    } finally {
      setSmtpBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-12">
      <AdminPageHeader title={t("admin.settings.title")} subtitle={t("admin.settings.subtitle")} />

      <Tabs value={settingsTab} onValueChange={(v) => setSettingsTab(v as typeof settingsTab)} className="w-full space-y-6">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 p-1">
          <TabsTrigger value="general" className="gap-2">
            <Sparkles className="h-4 w-4 shrink-0" aria-hidden />
            {t("admin.settings.tabs.general")}
          </TabsTrigger>
          <TabsTrigger value="leadForms" className="gap-2">
            <SlidersHorizontal className="h-4 w-4 shrink-0" aria-hidden />
            {t("admin.settings.tabs.leadForms")}
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4 shrink-0" aria-hidden />
            {t("admin.settings.tabs.notifications")}
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="h-4 w-4 shrink-0 text-brand-navy" aria-hidden />
            {t("admin.settings.tabs.security")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-6 space-y-10 focus-visible:ring-0">
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

          <AdminSurfaceCard className="relative overflow-hidden p-8 md:p-10">
            <div className="relative flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
              <div className="flex gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-800 ring-1 ring-emerald-500/20">
                  <Mail className="h-7 w-7" aria-hidden strokeWidth={1.75} />
                </div>
                <div className="min-w-0 space-y-1">
                  <h2 className="text-xl font-bold text-brand-navy">{t("admin.settings.smtpTestTitle")}</h2>
                  <p className="max-w-xl text-sm leading-relaxed text-brand-slate">{t("admin.settings.smtpTestSubtitle")}</p>
                </div>
              </div>
              <div className="w-full max-w-md space-y-4 md:w-auto md:min-w-[320px]">
                <div className="space-y-2">
                  <Label htmlFor="smtp-test-to" className="text-brand-navy">{t("common.email")}</Label>
                  <Input
                    id="smtp-test-to"
                    type="email"
                    placeholder={t("admin.settings.smtpTestPlaceholder")}
                    value={smtpTo}
                    onChange={(e) => setSmtpTo(e.target.value)}
                    className="border-brand-navy/15"
                  />
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full gap-2 font-semibold md:w-auto"
                  disabled={smtpBusy}
                  onClick={() => void sendSmtpTest()}
                >
                  {smtpBusy ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      {t("common.loading")}
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4" aria-hidden />
                      {t("admin.settings.smtpTestSend")}
                    </>
                  )}
                </Button>
                {smtpMessage ? (
                  <p
                    role="status"
                    className={
                      smtpMessage.variant === "ok"
                        ? "rounded-lg border border-emerald-200/80 bg-emerald-50/90 px-3 py-2 text-sm text-emerald-950"
                        : "rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900"
                    }
                  >
                    {smtpMessage.text}
                  </p>
                ) : null}
              </div>
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
        </TabsContent>

        <TabsContent value="leadForms" className="mt-6 focus-visible:ring-0">
          <LeadFormSettingsPanel />
        </TabsContent>

        <TabsContent value="notifications" className="mt-6 focus-visible:ring-0">
          <NotificationSettingsPanel />
        </TabsContent>

        <TabsContent value="security" className="mt-6 focus-visible:ring-0">
          <SecuritySettingsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}