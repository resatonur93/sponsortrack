"use client";

import { useCallback, useEffect, useState } from "react";
import { DocumentCard, type TimelineRow } from "./DocumentCard";
import {
  MissingDocumentsAlert,
  type MissingDoc,
} from "./MissingDocumentsAlert";
import { DocumentTimelineItem } from "@/components/ui/DocumentTimelineItem";

export function DocumentTimeline(props: {
  workerId: string;
}): JSX.Element {
  const [items, setItems] = useState<TimelineRow[]>([]);
  const [missing, setMissing] = useState<MissingDoc[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    const res = await fetch(
      `/api/workers/${props.workerId}/documents/timeline`,
      { credentials: "include" }
    );
    if (res.ok) {
      const json = (await res.json()) as {
        data: { items: TimelineRow[]; missingRequired: MissingDoc[] };
      };
      setItems(json.data.items);
      setMissing(json.data.missingRequired);
    }
    setLoading(false);
  }, [props.workerId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return <p className="text-sm text-slate-600">Belge zaman çizelgesi yükleniyor…</p>;
  }

  return (
    <div className="space-y-6">
      <MissingDocumentsAlert items={missing} workerId={props.workerId} />
      <div className="relative border-l-2 border-brand-royal/25 pl-6">
        <ul className="space-y-6">
          {items.map((row) => (
            <DocumentTimelineItem key={row.document.id}>
              <DocumentCard
                row={row}
                workerId={props.workerId}
                onUpdated={() => void load()}
              />
            </DocumentTimelineItem>
          ))}
        </ul>
        {items.length === 0 ? (
          <p className="text-sm text-slate-600">Henüz belge yok.</p>
        ) : null}
      </div>
    </div>
  );
}
