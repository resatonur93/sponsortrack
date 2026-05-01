"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export type MissingDoc = {
  slotId?: string;
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

  const critical = props.items.some((m) => m.urgency === "HIGH");

  return (
    <div
      className={`rounded-lg border p-4 text-sm ${
        critical
          ? "border-red-200 bg-red-50"
          : "border-amber-200 bg-amber-50"
      }`}
    >
      <p
        className={`font-semibold ${critical ? "text-red-900" : "text-amber-950"}`}
      >
        Eksik / riskli zorunlu belgeler
      </p>
      <ul className="mt-2 space-y-1">
        {props.items.map((m) => (
          <li
            key={`${m.slotId ?? m.documentType}-${m.reason}`}
            className="flex flex-wrap items-center gap-2"
          >
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
