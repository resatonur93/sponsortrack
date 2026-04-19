"use client";

import { Badge } from "@/components/ui/badge";
import type { AnomalyFinding } from "@/lib/anomalies";

export function AnomalyList(props: { items: AnomalyFinding[] }): JSX.Element {
  if (props.items.length === 0) {
    return (
      <p className="text-sm text-slate-600">Anomali bulunamadı (seçilen aralıkta).</p>
    );
  }
  return (
    <ul className="space-y-2">
      {props.items.map((a, i) => (
        <li
          key={`${a.code}-${i}`}
          className="flex flex-wrap items-start gap-2 rounded border border-slate-200 bg-white p-3 text-sm"
        >
          <Badge variant={a.severity === "HIGH" ? "danger" : "warning"}>
            {a.severity}
          </Badge>
          <span className="font-mono text-xs text-slate-500">{a.code}</span>
          <span className="text-slate-800">{a.message}</span>
        </li>
      ))}
    </ul>
  );
}
