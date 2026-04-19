"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Summary = {
  totalActiveWorkers: number;
  pendingReports: number;
  overdueReports: number;
  visasExpiring30d: number;
  documentsExpiring30d: number;
  openOrganisationChanges: number;
  recentAuditLogs: {
    id: string;
    action: string;
    entityType: string;
    createdAt: string;
  }[];
};

export default function CompliancePage(): JSX.Element {
  const [data, setData] = useState<Summary | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/compliance/summary", { credentials: "include" });
      if (!res.ok) {
        setErr("Özet yüklenemedi");
        return;
      }
      const j = (await res.json()) as { data: Summary };
      setData(j.data);
    })();
  }, []);

  if (err) return <p className="text-red-600">{err}</p>;
  if (!data) return <p className="text-slate-600">Yükleniyor...</p>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-blue-900">Uyum &amp; denetim</h1>
        <p className="text-slate-600">
          Geciken raporlar, yaklaşan süreler ve denetim izi özeti
        </p>
        <p className="mt-2">
          <Link
            href="/compliance/audit"
            className="text-sm font-medium text-blue-900 underline"
          >
            Audit pack &amp; anomali raporu →
          </Link>
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Stat label="Aktif sponsorlu çalışan" value={data.totalActiveWorkers} />
        <Stat label="Bekleyen rapor (event)" value={data.pendingReports} warn />
        <Stat label="Geciken rapor" value={data.overdueReports} danger />
        <Stat label="30 gün içinde vize bitişi" value={data.visasExpiring30d} />
        <Stat label="30 gün içinde belge süresi" value={data.documentsExpiring30d} />
        <Stat label="Açık kurum değişikliği" value={data.openOrganisationChanges} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Son denetim kayıtları</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {data.recentAuditLogs.length === 0 ? (
              <li className="text-slate-500">Kayıt yok</li>
            ) : (
              data.recentAuditLogs.map((a) => (
                <li key={a.id} className="border-b border-slate-100 pb-2">
                  <span className="font-medium text-slate-800">{a.action}</span> ·{" "}
                  {a.entityType}{" "}
                  <span className="text-slate-500">
                    {new Date(a.createdAt).toLocaleString("en-GB")}
                  </span>
                </li>
              ))
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat(props: {
  label: string;
  value: number;
  warn?: boolean;
  danger?: boolean;
}): JSX.Element {
  const color =
    props.danger && props.value > 0
      ? "text-red-600"
      : props.warn && props.value > 0
        ? "text-amber-600"
        : "text-blue-900";
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-xs text-slate-500">{props.label}</p>
        <p className={`text-2xl font-bold ${color}`}>{props.value}</p>
      </CardContent>
    </Card>
  );
}
