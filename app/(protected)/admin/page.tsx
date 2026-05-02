"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { LeadStatus } from "@prisma/client";
import { ArrowUpRight, RefreshCw } from "lucide-react";
import { AdminDashboardKpis } from "@/components/admin/AdminDashboardKpis";
import { AdminLeadStatusDonut, AdminLeadsTrendChart } from "@/components/admin/AdminCharts";
import { AdminRecentLeadsTable } from "@/components/admin/AdminRecentLeadsTable";
import { Button } from "@/components/ui/button";
import { PageLoading } from "@/components/ui/page-loading";
import { AdminPageHeader } from "@/components/admin/shell/AdminPageShell";
import type { AdminDashboardPayload } from "@/lib/admin/dashboard-types";
import { useTranslation } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

export default function AdminDashboardPage(): JSX.Element {
  const { t, locale } = useTranslation();
  const localeTag = locale === "tr" ? "tr-TR" : "en-GB";
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<AdminDashboardPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/dashboard", {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) {
        setError(t("admin.dashboard.errorLoad"));
        return;
      }
      const json = (await res.json()) as { data: AdminDashboardPayload };
      setStats(json.data);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      router.replace("/login");
      return;
    }
    if (!session?.user?.canAccessAdminPanel) {
      router.replace("/dashboard");
      return;
    }
    void load();
  }, [status, session?.user?.canAccessAdminPanel, router, load]);

  const labelStatus = useCallback((s: LeadStatus) => t(`admin.leadStatus.${s}`), [t]);

  if (status === "loading" || !session) {
    return <PageLoading message={t("common.loading")} />;
  }
  if (!session.user.canAccessAdminPanel) {
    return <PageLoading message={t("common.loading")} />;
  }
  if (error && !stats) {
    return (
      <div
        className="space-y-4 rounded-xl border border-danger-border bg-danger-muted px-6 py-8"
        role="alert"
      >
        <p className="text-sm font-semibold text-danger">{error}</p>
        <Button variant="outline" onClick={() => void load()} className="border-brand-navy/30">
          {t("common.retry")}
        </Button>
      </div>
    );
  }
  if (!stats) {
    return <PageLoading message={t("common.loading")} />;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-8">
      <AdminPageHeader
        title={t("admin.dashboard.title")}
        subtitle={t("admin.dashboard.subtitle")}
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              className="h-11 gap-2 border-brand-navy/25 font-semibold text-brand-navy shadow-sm"
              disabled={loading}
              onClick={() => void load()}
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} aria-hidden />
              {t("admin.dashboard.refresh")}
            </Button>
            <Button asChild className="h-11 gap-2 px-6 font-semibold shadow-md">
              <Link href="/admin/leads">
                {t("admin.dashboard.ctaAllLeads")}
                <ArrowUpRight className="h-4 w-4 opacity-90" aria-hidden />
              </Link>
            </Button>
          </>
        }
      />

      <AdminDashboardKpis
        totalLeads={stats.totalLeads}
        newToday={stats.newLeadsToday}
        conversionPercent={stats.conversionRate}
        distinctSources={stats.distinctSourceCount}
        conversionHint={t("admin.dashboard.kpi.conversionHint")}
        sourcesHint={t("admin.dashboard.kpi.sourcesHint")}
        convertedLabel={t("admin.dashboard.kpi.convertedShort")}
        t={t}
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <AdminLeadsTrendChart
          data={stats.leadsByDay}
          title={t("admin.dashboard.chart.trendTitle")}
          emptyHint={t("admin.dashboard.chart.trendEmpty")}
          localeTag={localeTag}
          leadsLabel={t("admin.dashboard.chart.leadsAxis")}
        />
        <AdminLeadStatusDonut
          data={stats.leadsByStatus.map((x) => ({ status: x.status, count: x.count }))}
          title={t("admin.dashboard.chart.statusTitle")}
          emptyHint={t("admin.dashboard.chart.statusEmpty")}
          labelForStatus={labelStatus}
        />
      </div>

      <AdminRecentLeadsTable
        rows={stats.recentLeads}
        localeTag={localeTag}
        t={t}
        labelStatus={labelStatus}
      />
    </div>
  );
}
