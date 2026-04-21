"use client";

import { useCallback, useEffect, useState } from "react";
import type { DocumentType } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type ChecklistItem = {
  documentType: DocumentType;
  label: string;
  status: "ok" | "missing" | "expired" | "expiring_soon";
  urgency: "HIGH" | "MEDIUM" | "LOW" | null;
  latest: {
    id: string;
    fileName: string;
    uploadDate: string;
    expiryDate: string | null;
  } | null;
};

const STATUS_LABEL: Record<ChecklistItem["status"], string> = {
  ok: "Yüklü",
  missing: "Eksik",
  expired: "Süresi doldu",
  expiring_soon: "Süre yakında bitiyor",
};

function statusBadgeVariant(
  s: ChecklistItem["status"]
): "success" | "danger" | "warning" | "outline" {
  switch (s) {
    case "ok":
      return "success";
    case "missing":
      return "danger";
    case "expired":
      return "danger";
    case "expiring_soon":
      return "warning";
    default:
      return "outline";
  }
}

type Props = {
  workerId: string;
  /** Increment or change after uploads to refetch checklist. */
  refreshKey?: number;
};

export function WorkerDocumentChecklist(props: Props): JSX.Element {
  const [items, setItems] = useState<ChecklistItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    const res = await fetch(`/api/workers/${props.workerId}/missing-documents`, {
      credentials: "include",
      cache: "no-store",
    });
    setLoading(false);
    if (!res.ok) {
      setError("Kontrol listesi yüklenemedi.");
      setItems(null);
      return;
    }
    const json = (await res.json()) as { data: { checklist: ChecklistItem[] } };
    setItems(json.data.checklist ?? []);
    setError(null);
  }, [props.workerId]);

  useEffect(() => {
    void load();
  }, [load, props.refreshKey]);

  if (loading && items === null) {
    return (
      <Card className="border-brand-navy/20">
        <CardContent className="py-6 text-sm text-slate-500">
          Belge kontrol listesi yükleniyor…
        </CardContent>
      </Card>
    );
  }
  if (error) {
    return (
      <Card className="border-red-200">
        <CardContent className="py-4 text-sm text-red-700">{error}</CardContent>
      </Card>
    );
  }
  if (!items || items.length === 0) {
    return (
      <Card className="border-slate-200 bg-slate-50/80">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Zorunlu belge özeti</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-600">
          Bu çalışanın mevcut durumu için tanımlı zorunlu belge kuralı yok (ör. işe
          başlamayı bekliyor veya işten ayrılmış olabilir).
        </CardContent>
      </Card>
    );
  }

  const okCount = items.filter((i) => i.status === "ok").length;
  const total = items.length;

  return (
    <Card className="border-brand-navy/25 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">Zorunlu belgeler — durum özeti</CardTitle>
          <Badge variant="outline" className="w-fit font-normal">
            {okCount} / {total} tamam
          </Badge>
        </div>
        <p className="text-xs text-slate-600">
          Eksik veya süresi geçmiş belgeleri aşağıdan yükleyin. Yükleme formu bu
          listenin altında.
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
          {items.map((row) => (
            <li
              key={row.documentType}
              className={cn(
                "flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between",
                row.status === "missing" && "bg-red-50/50",
                row.status === "expired" && "bg-red-50/40",
                row.status === "expiring_soon" && "bg-amber-50/50",
                row.status === "ok" && "bg-emerald-50/30"
              )}
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-slate-900">{row.label}</span>
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {row.documentType}
                  </Badge>
                  <Badge variant={statusBadgeVariant(row.status)}>
                    {STATUS_LABEL[row.status]}
                  </Badge>
                </div>
                {row.latest ? (
                  <p className="mt-1 text-xs text-slate-600">
                    Dosya: <span className="font-medium">{row.latest.fileName}</span>
                    {" · "}
                    Yükleme:{" "}
                    {new Date(row.latest.uploadDate).toLocaleDateString("tr-TR")}
                    {row.latest.expiryDate
                      ? ` · Bitiş: ${new Date(row.latest.expiryDate).toLocaleDateString("tr-TR")}`
                      : " · Bitiş tarihi yok"}
                  </p>
                ) : row.status === "missing" ? (
                  <p className="mt-1 text-xs text-red-800">
                    Henüz yüklenmedi — formdan bu türü seçip yükleyin.
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
