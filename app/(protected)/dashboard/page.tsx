"use client";

import { useEffect, useState } from "react";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { RiskBadge } from "@/components/dashboard/RiskBadge";
import { RecentEvents } from "@/components/dashboard/RecentEvents";
import type { RiskResult } from "@/lib/risk-score";
import type { NotificationType } from "@prisma/client";
import Link from "next/link";

type DashboardPayload = {
  stats: {
    totalWorkers: number;
    activeSponsorships: number;
    pendingNotifications: number;
    overdueNotifications: number;
    missingDocumentIssues: number;
  };
  highPriorityMissing: {
    workerId: string;
    name: string;
    labels: string[];
  }[];
  risk: RiskResult;
  recentEvents: {
    id: string;
    eventType: NotificationType;
    status: string;
    dueDate: string;
    worker: { firstName: string; lastName: string; id: string };
  }[];
};

export default function DashboardPage(): JSX.Element {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/dashboard", { credentials: "include" });
      if (!res.ok) {
        setError("Veri yüklenemedi");
        return;
      }
      const json = (await res.json()) as { data: DashboardPayload };
      setData(json.data);
    })();
  }, []);

  if (error) {
    return <p className="text-red-600">{error}</p>;
  }
  if (!data) {
    return <p className="text-slate-600">Yükleniyor...</p>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-blue-900">Dashboard</h1>
        <p className="text-slate-600">Özet ve risk görünümü</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatsCard title="Toplam çalışan" value={data.stats.totalWorkers} />
        <StatsCard
          title="Aktif sponsorluk"
          value={data.stats.activeSponsorships}
        />
        <StatsCard
          title="Bekleyen bildirim"
          value={data.stats.pendingNotifications}
        />
        <StatsCard
          title="Geciken bildirim"
          value={data.stats.overdueNotifications}
        />
        <StatsCard
          title="Eksik belge (kayıt)"
          value={data.stats.missingDocumentIssues ?? 0}
        />
      </div>
      {data.highPriorityMissing && data.highPriorityMissing.length > 0 ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <h2 className="text-sm font-semibold text-red-900">
            Yüksek öncelikli eksik belgeler
          </h2>
          <ul className="mt-2 space-y-1 text-sm">
            {data.highPriorityMissing.map((h) => (
              <li key={h.workerId}>
                <Link
                  href={`/workers/${h.workerId}`}
                  className="font-medium text-blue-900 underline"
                >
                  {h.name}
                </Link>
                : {h.labels.join(", ")}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-sm font-medium text-slate-600">Risk skoru</h2>
          <RiskBadge level={data.risk.level} score={data.risk.score} />
        </div>
      </div>
      <RecentEvents events={data.recentEvents} />
    </div>
  );
}
