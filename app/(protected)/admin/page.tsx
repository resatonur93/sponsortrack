"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { LeadStatus } from "@prisma/client";
import { AdminStatsCard } from "@/components/admin/AdminStatsCard";
import {
  AdminLeadStatusPie,
  AdminLeadsTrendChart,
} from "@/components/admin/AdminCharts";
import { LeadStatusBadge } from "@/components/admin/LeadStatusBadge";
import { Button } from "@/components/ui/button";

type StatsPayload = {
  totalLeads: number;
  newLeadsToday: number;
  conversionRate: number;
  leadsByStatus: { status: LeadStatus; count: number }[];
  leadsBySource: { source: string; count: number }[];
  leadsByDay: { date: string; count: number }[];
  recentActivity: {
    id: string;
    email: string;
    companyName: string | null;
    name: string | null;
    status: LeadStatus;
    source: string;
    createdAt: string;
  }[];
};

export default function AdminDashboardPage(): JSX.Element {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<StatsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    void (async () => {
      const res = await fetch("/api/admin/stats", {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) {
        setError("İstatistikler yüklenemedi.");
        return;
      }
      const json = (await res.json()) as { data: StatsPayload };
      setStats(json.data);
    })();
  }, [status, session?.user?.canAccessAdminPanel, router]);

  if (status === "loading" || !session) {
    return <p className="text-slate-400">Yükleniyor...</p>;
  }
  if (!session.user.canAccessAdminPanel) {
    return <p className="text-slate-400">Yönlendiriliyor...</p>;
  }
  if (error) {
    return <p className="text-rose-400">{error}</p>;
  }
  if (!stats) {
    return <p className="text-slate-400">Yükleniyor...</p>;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-50">Admin dashboard</h1>
          <p className="text-sm text-slate-400">Lead özetleri ve son hareketler</p>
        </div>
        <Button asChild className="bg-[#1E5BB5] hover:bg-[#1a4fa0]">
          <Link href="/admin/leads">Tüm leadler</Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStatsCard title="Toplam lead" value={stats.totalLeads} />
        <AdminStatsCard title="Bugün yeni" value={stats.newLeadsToday} />
        <AdminStatsCard
          title="Dönüşüm oranı"
          value={`${stats.conversionRate}%`}
          hint="CONVERTED / toplam"
        />
        <AdminStatsCard
          title="Kaynak çeşidi"
          value={stats.leadsBySource.length}
          hint="Farklı source"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <AdminLeadsTrendChart data={stats.leadsByDay} />
        <AdminLeadStatusPie
          data={stats.leadsByStatus.map((s) => ({
            status: s.status,
            count: s.count,
          }))}
        />
      </div>

      <div className="rounded-lg border border-slate-700 bg-[#1E293B]">
        <div className="border-b border-slate-700 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-200">Son 10 lead</h2>
        </div>
        <ul className="divide-y divide-slate-700">
          {stats.recentActivity.length === 0 ? (
            <li className="px-4 py-6 text-sm text-slate-500">Kayıt yok</li>
          ) : (
            stats.recentActivity.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
              >
                <div>
                  <Link
                    href={`/admin/leads/${r.id}`}
                    className="font-medium text-[#60A5FA] hover:underline"
                  >
                    {r.email}
                  </Link>
                  <span className="text-slate-500">
                    {" "}
                    · {r.companyName ?? "—"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <LeadStatusBadge status={r.status} />
                  <span className="text-xs text-slate-500">{r.source}</span>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
