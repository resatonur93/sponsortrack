"use client";

import type { NotificationType } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { dedupeVisaExpiringByWorker } from "@/lib/recent-notifications";
import { useTranslation } from "@/contexts/LanguageContext";

function tEnum(
  translate: (key: string, fallback?: string) => string,
  key: string,
  fallback: string
): string {
  const v = translate(key, fallback);
  return v === key ? fallback : v;
}

type EventRow = {
  id: string;
  eventType: NotificationType;
  status: string;
  dueDate: string;
  createdAt?: string;
  worker: { firstName: string; lastName: string; id: string };
};

export function RecentEvents(props: { events: EventRow[] }): JSX.Element {
  const { t, locale } = useTranslation();
  const localeTag = locale === "tr" ? "tr-TR" : "en-GB";
  const mapped = props.events.map((e) => ({
    id: e.id,
    workerId: e.worker.id,
    eventType: e.eventType,
    status: e.status,
    dueDate: new Date(e.dueDate),
    createdAt: new Date(e.createdAt ?? e.dueDate),
    worker: e.worker,
  }));

  const deduped = dedupeVisaExpiringByWorker(mapped);

  const events: EventRow[] = deduped.map((row) => {
    const orig = props.events.find((ev) => ev.id === row.id);
    return (
      orig ?? {
        id: row.id,
        eventType: row.eventType,
        status: row.status,
        dueDate: row.dueDate.toISOString(),
        createdAt: row.createdAt.toISOString(),
        worker: row.worker,
      }
    );
  });

  return (
    <Card className="border-brand-navy/15 shadow-card">
      <CardHeader>
        <CardTitle className="text-brand-navy">{t("dashboard.recentNotifications")}</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {events.length === 0 ? (
            <li className="text-sm text-slate-500">{t("common.noRecords")}</li>
          ) : (
            events.map((e) => (
              <li
                key={e.id}
                className="flex flex-col rounded-md border border-brand-navy/10 bg-white p-3 text-sm shadow-sm"
              >
                <span className="font-medium text-brand-navy">
                  {e.worker.firstName} {e.worker.lastName}
                </span>
                <span className="text-slate-600">
                  {tEnum(t, `notifications.type.${e.eventType}`, e.eventType)}
                </span>
                <span className="text-xs text-slate-500">
                  {new Date(e.dueDate).toLocaleDateString(localeTag)} ·{" "}
                  {tEnum(t, `notifications.status.${e.status}`, e.status)}
                </span>
              </li>
            ))
          )}
        </ul>
      </CardContent>
    </Card>
  );
}
