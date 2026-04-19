import type { NotificationType } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type EventRow = {
  id: string;
  eventType: NotificationType;
  status: string;
  dueDate: string;
  worker: { firstName: string; lastName: string; id: string };
};

export function RecentEvents(props: { events: EventRow[] }): JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Son bildirimler</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {props.events.length === 0 ? (
            <li className="text-sm text-slate-500">Kayıt yok</li>
          ) : (
            props.events.map((e) => (
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
