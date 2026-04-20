"use client";

import { useEffect, useState } from "react";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { RiskBadge } from "@/components/dashboard/RiskBadge";
import { RecentEvents } from "@/components/dashboard/RecentEvents";
import type { RiskResult } from "@/lib/risk-score";
import type { NotificationType } from "@prisma/client";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
  missingDocumentsTable: {
    workerId: string;
    name: string;
    highCount: number;
    mediumCount: number;
    lowCount: number;
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
        <h1 className="text-2xl font-bold text-brand-navy">Dashboard</h1>
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
                  className="font-medium text-brand-navy underline"
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
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">Eksik belge takibi</h2>
          <span className="text-xs text-slate-500">
            {data.missingDocumentsTable?.length ?? 0} çalışan listeleniyor
          </span>
        </div>
        {!data.missingDocumentsTable || data.missingDocumentsTable.length === 0 ? (
          <p className="text-sm text-slate-500">Eksik ya da süresi geçen zorunlu belge yok.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">S.No</TableHead>
                <TableHead>Çalışan</TableHead>
                <TableHead>Eksik belge başlıkları</TableHead>
                <TableHead className="w-24">Yüksek</TableHead>
                <TableHead className="w-24">Orta</TableHead>
                <TableHead className="w-24">Düşük</TableHead>
                <TableHead className="w-24 text-right">Detay</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.missingDocumentsTable.map((row, idx) => (
                <TableRow key={row.workerId}>
                  <TableCell>{idx + 1}</TableCell>
                  <TableCell>
                    <Link
                      href={`/workers/${row.workerId}`}
                      className="font-medium text-brand-navy underline"
                    >
                      {row.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {row.labels.slice(0, 3).map((label) => (
                        <Badge key={`${row.workerId}-${label}`} variant="outline">
                          {label}
                        </Badge>
                      ))}
                      {row.labels.length > 3 ? (
                        <Badge variant="outline">+{row.labels.length - 3}</Badge>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={row.highCount > 0 ? "danger" : "outline"}>
                      {row.highCount}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={row.mediumCount > 0 ? "warning" : "outline"}>
                      {row.mediumCount}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={row.lowCount > 0 ? "success" : "outline"}>
                      {row.lowCount}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/workers/${row.workerId}`}
                      className="text-sm text-brand-navy underline"
                    >
                      Aç
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
      <RecentEvents events={data.recentEvents} />
    </div>
  );
}
