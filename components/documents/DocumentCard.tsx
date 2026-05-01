"use client";

import { useState } from "react";
import Link from "next/link";
import type { Document } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export type TimelineRow = {
  document: Document;
  display: Record<string, unknown>;
  status: "VALID" | "EXPIRING_SOON" | "EXPIRED" | "UNKNOWN";
};

function statusClass(s: TimelineRow["status"]): string {
  switch (s) {
    case "VALID":
      return "border-emerald-300 bg-emerald-50";
    case "EXPIRING_SOON":
      return "border-amber-300 bg-amber-50";
    case "EXPIRED":
      return "border-red-300 bg-red-50";
    default:
      return "border-slate-200 bg-white";
  }
}

function statusLabel(s: TimelineRow["status"]): string {
  switch (s) {
    case "VALID":
      return "Geçerli";
    case "EXPIRING_SOON":
      return "30 gün içinde süre";
    case "EXPIRED":
      return "Süresi dolmuş";
    default:
      return "—";
  }
}

export function DocumentCard(props: {
  row: TimelineRow;
  workerId: string;
  onUpdated: () => void;
}): JSX.Element {
  const { document: doc, display, status } = props.row;
  const [busy, setBusy] = useState(false);

  async function verify(): Promise<void> {
    setBusy(true);
    await fetch(`/api/documents/${doc.id}/verify`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ verificationNote: null }),
    });
    setBusy(false);
    props.onUpdated();
  }

  const entries = Object.entries(display).filter(
    ([, v]) => v !== undefined && v !== null && v !== ""
  );

  return (
    <Card className={`border ${statusClass(status)}`}>
      <CardHeader className="py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold">
            {doc.documentType} · v{doc.version}
          </CardTitle>
          <Badge variant={status === "EXPIRED" ? "danger" : "outline"}>
            {statusLabel(status)}
          </Badge>
        </div>
        <p className="text-xs text-slate-600">{doc.fileName}</p>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {doc.expiryDate ? (
          <p className="text-slate-700">
            Bitiş: {new Date(doc.expiryDate).toLocaleDateString("en-GB")}
          </p>
        ) : null}
        {entries.length > 0 ? (
          <dl className="grid gap-1 text-xs">
            {entries.map(([k, v]) => (
              <div key={k} className="flex gap-2">
                <dt className="text-slate-500">{k}</dt>
                <dd className="font-medium text-slate-800">{String(v)}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-xs text-slate-500">Ayrıntı metadata yok (yüklemede JSON eklenebilir).</p>
        )}
        {doc.verifiedAt ? (
          <p className="text-xs text-emerald-800">
            Doğrulandı: {new Date(doc.verifiedAt).toLocaleString("en-GB")}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2 border-t border-slate-200/80 pt-3">
          {!doc.verifiedAt ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => void verify()}
            >
              Verify
            </Button>
          ) : null}
          <Button type="button" size="sm" variant="secondary" asChild>
            <Link href={`/workers/${props.workerId}/documents`}>
              {"Vault'ta sürüm yükle"}
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
