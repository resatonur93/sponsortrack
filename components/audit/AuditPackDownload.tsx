"use client";

import { useState } from "react";
import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Pack = {
  workers: unknown[];
  notifications: unknown[];
  documents: unknown[];
  salaryChanges: unknown[];
  absences: unknown[];
  changeLogs: unknown[];
  anomalies: unknown[];
};

export function AuditPackDownload(): JSX.Element {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [workerId, setWorkerId] = useState("");
  const [loading, setLoading] = useState(false);
  const [pack, setPack] = useState<Pack | null>(null);

  async function load(): Promise<void> {
    setLoading(true);
    const q = new URLSearchParams();
    if (dateFrom) q.set("dateFrom", dateFrom);
    if (dateTo) q.set("dateTo", dateTo);
    if (workerId.trim()) q.set("workerId", workerId.trim());
    const res = await fetch(`/api/compliance/audit-pack?${q}`, {
      credentials: "include",
    });
    if (res.ok) {
      const json = (await res.json()) as { data: Pack };
      setPack(json.data);
    }
    setLoading(false);
  }

  function downloadPdf(): void {
    if (!pack) return;
    const doc = new jsPDF();
    let y = 12;
    doc.setFontSize(14);
    doc.text("SponsorTrack Audit Pack", 10, y);
    y += 8;
    doc.setFontSize(10);
    doc.text(`Workers: ${pack.workers.length}`, 10, y);
    y += 6;
    doc.text(`Notifications: ${pack.notifications.length}`, 10, y);
    y += 6;
    doc.text(`Documents: ${pack.documents.length}`, 10, y);
    y += 6;
    doc.text(`Salary changes: ${pack.salaryChanges.length}`, 10, y);
    y += 6;
    doc.text(`Absences: ${pack.absences.length}`, 10, y);
    y += 6;
    doc.text(`Anomalies: ${pack.anomalies.length}`, 10, y);
    y += 10;
    doc.text("Anomaly summary:", 10, y);
    y += 6;
    for (const a of pack.anomalies as { message: string }[]) {
      if (y > 280) {
        doc.addPage();
        y = 12;
      }
      doc.text(`- ${a.message}`, 12, y);
      y += 5;
    }
    doc.save(`audit-pack-${dateFrom || "all"}-${dateTo || "all"}.pdf`);
  }

  function downloadXlsx(): void {
    if (!pack) return;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(pack.workers as object[]),
      "workers"
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(pack.notifications as object[]),
      "notifications"
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(pack.documents as object[]),
      "documents"
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(pack.anomalies as object[]),
      "anomalies"
    );
    XLSX.writeFile(wb, `audit-pack-${dateFrom || "all"}.xlsx`);
  }

  return (
    <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Label>Başlangıç</Label>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </div>
        <div>
          <Label>Bitiş</Label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <Label>Worker ID (opsiyonel)</Label>
          <Input
            value={workerId}
            onChange={(e) => setWorkerId(e.target.value)}
            placeholder="cuid..."
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={loading} onClick={() => void load()}>
          {loading ? "Yükleniyor…" : "Önizleme yükle"}
        </Button>
        {pack ? (
          <>
            <Button type="button" variant="outline" onClick={downloadPdf}>
              PDF indir
            </Button>
            <Button type="button" variant="outline" onClick={downloadXlsx}>
              Excel indir
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );
}
