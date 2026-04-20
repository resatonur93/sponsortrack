"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AuditPackDownload } from "@/components/audit/AuditPackDownload";
import { AnomalyList } from "@/components/audit/AnomalyList";
import type { AnomalyFinding } from "@/lib/anomalies";

type Pack = {
  workers: { id: string; firstName: string; lastName: string; email: string }[];
  notifications: { id: string; eventType: string; status: string }[];
  documents: { id: string; documentType: string; fileName: string }[];
  salaryChanges: unknown[];
  absences: unknown[];
  changeLogs: unknown[];
  anomalies: AnomalyFinding[];
};

export default function ComplianceAuditPage(): JSX.Element {
  const [pack, setPack] = useState<Pack | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/compliance/audit-pack", {
        credentials: "include",
      });
      if (!res.ok) {
        setErr("Veri alınamadı");
        return;
      }
      const json = (await res.json()) as { data: Pack };
      setPack(json.data);
    })();
  }, []);

  if (err) {
    return <p className="text-red-600">{err}</p>;
  }
  if (!pack) {
    return <p className="text-slate-600">Yükleniyor…</p>;
  }

  return (
    <div className="space-y-8">
      <div>
        <Link href="/compliance" className="text-sm text-brand-navy hover:underline">
          ← Uyum özeti
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-brand-navy">Audit pack</h1>
        <p className="text-slate-600">
          Denetim verisi, anomali taraması ve dışa aktarma
        </p>
      </div>

      <AuditPackDownload />

      <section>
        <h2 className="mb-2 text-lg font-semibold text-brand-navy">Anomaliler</h2>
        <AnomalyList items={pack.anomalies} />
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-brand-navy">Önizleme — çalışanlar</h2>
        <div className="rounded-md border border-slate-200 bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ad</TableHead>
                <TableHead>E-posta</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pack.workers.slice(0, 25).map((w) => (
                <TableRow key={w.id}>
                  <TableCell>
                    {w.firstName} {w.lastName}
                  </TableCell>
                  <TableCell className="text-xs">{w.email}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-brand-navy">Önizleme — bildirimler</h2>
        <div className="rounded-md border border-slate-200 bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tip</TableHead>
                <TableHead>Durum</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pack.notifications.slice(0, 25).map((n) => (
                <TableRow key={n.id}>
                  <TableCell className="text-xs">{n.eventType}</TableCell>
                  <TableCell>{n.status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
