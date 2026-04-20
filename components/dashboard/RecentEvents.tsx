import type { NotificationType } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { dedupeVisaExpiringByWorker } from "@/lib/recent-notifications";

type EventRow = {
  id: string;
  eventType: NotificationType;
  status: string;
  dueDate: string;
  createdAt?: string;
  worker: { firstName: string; lastName: string; id: string };
};

export function RecentEvents(props: { events: EventRow[] }): JSX.Element {
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
    <Card>
      <CardHeader>
        <CardTitle>Son bildirimler</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {events.length === 0 ? (
            <li className="text-sm text-slate-500">Kayıt yok</li>
          ) : (
            events.map((e) => (
              <li
                key={e.id}
                className="flex flex-col rounded-md border border-slate-100 p-3 text-sm"
              >
                <span className="font-medium text-slate-900">
                  {e.worker.firstName} {e.worker.lastName}
                </span>
                <span className="text-slate-600">{e.eventType}</span>
                <span className="text-xs text-slate-500">
                  {new Date(e.dueDate).toLocaleDateString("en-GB")} · {e.status}
                </span>
              </li>
            ))
          )}
        </ul>
      </CardContent>
    </Card>
  );
}
