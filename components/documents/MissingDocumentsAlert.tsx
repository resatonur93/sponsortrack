"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export type MissingDoc = {
  documentType: string;
  label: string;
  urgency: "HIGH" | "MEDIUM" | "LOW";
  reason: string;
};

export function MissingDocumentsAlert(props: {
  items: MissingDoc[];
  workerId: string;
}): JSX.Element | null {
  if (props.items.length === 0) return null;

  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm">
      <p className="font-semibold text-red-900">Eksik / riskli zorunlu belgeler</p>
      <ul className="mt-2 space-y-1">
        {props.items.map((m) => (
          <li key={`${m.documentType}-${m.reason}`} className="flex flex-wrap items-center gap-2">
            <Badge
              variant={
                m.urgency === "HIGH"
                  ? "danger"
                  : m.urgency === "MEDIUM"
                    ? "warning"
                    : "outline"
              }
            >
              {m.urgency}
            </Badge>
            <span className="text-slate-800">{m.label}</span>
            <span className="text-xs text-slate-500">({m.reason})</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-slate-600">
        <Link href={`/workers/${props.workerId}`} className="text-brand-navy underline">
          Çalışan dosyası
        </Link>{" "}
        üzerinden vault’a yükleyin.
      </p>
    </div>
  );
}
