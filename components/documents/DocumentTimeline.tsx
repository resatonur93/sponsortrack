"use client";

import { useCallback, useEffect, useState } from "react";
import { DocumentCard, type TimelineRow } from "./DocumentCard";
import {
  MissingDocumentsAlert,
  type MissingDoc,
} from "./MissingDocumentsAlert";
import { useTranslation } from "@/contexts/LanguageContext";

export function DocumentTimeline(props: {
  workerId: string;
}): JSX.Element {
  const { t } = useTranslation();
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
    return (
      <p className="text-sm text-slate-600">{t("docTimeline.loading")}</p>
    );
  }

  return (
    <div className="space-y-8">
      <MissingDocumentsAlert items={missing} workerId={props.workerId} />
      <section
        aria-labelledby={`uploaded-docs-${props.workerId}`}
        className="space-y-4"
      >
        <header className="border-b border-slate-100 pb-2">
          <h2
            id={`uploaded-docs-${props.workerId}`}
            className="text-lg font-semibold text-brand-navy"
          >
            {t("docTimeline.sectionTitle")}
          </h2>
          <p className="mt-1 text-sm text-slate-600">{t("docTimeline.sectionHint")}</p>
        </header>
        <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
          {items.map((row) => (
            <DocumentCard
              key={row.document.id}
              row={row}
              workerId={props.workerId}
              onUpdated={() => void load()}
            />
          ))}
        </div>
        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-12 text-center text-sm text-slate-600">
            {t("docTimeline.empty")}
          </div>
        ) : null}
      </section>
    </div>
  );
}
