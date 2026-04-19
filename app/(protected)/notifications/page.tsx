"use client";

import { useEffect, useState } from "react";
import type { NotificationEvent, NotificationStatus, NotificationType } from "@prisma/client";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EscalationBadge } from "@/components/notifications/EscalationBadge";
import { formatDeadlineWindowLabel } from "@/lib/deadline-display";

type Row = NotificationEvent & {
  worker: { firstName: string; lastName: string; email: string };
};

export default function NotificationsPage(): JSX.Element {
  const [rows, setRows] = useState<Row[]>([]);
  const [status, setStatus] = useState<string>("all");
  const [type, setType] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = new URLSearchParams();
    if (status !== "all") q.set("status", status);
    if (type !== "all") q.set("type", type);
    void (async () => {
      setLoading(true);
      const res = await fetch(`/api/notifications?${q.toString()}`, {
        credentials: "include",
      });
      if (res.ok) {
        const json = (await res.json()) as { data: Row[] };
        setRows(json.data);
      }
      setLoading(false);
    })();
  }, [status, type]);

  async function complete(id: string): Promise<void> {
    const res = await fetch(`/api/notifications/${id}/complete`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (res.ok) {
      setRows((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, status: "COMPLETED" as NotificationStatus } : r
        )
      );
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-blue-900">Bildirimler</h1>
        <p className="text-slate-600">Uyum olayları ve tamamlama</p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="w-full sm:w-48">
          <label className="text-sm text-slate-600">Durum</label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tümü</SelectItem>
              <SelectItem value="PENDING">PENDING</SelectItem>
              <SelectItem value="OVERDUE">OVERDUE</SelectItem>
              <SelectItem value="COMPLETED">COMPLETED</SelectItem>
              <SelectItem value="CANCELLED">CANCELLED</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="w-full sm:w-56">
          <label className="text-sm text-slate-600">Tip</label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tümü</SelectItem>
              {(
                [
                  "NO_SHOW",
                  "SALARY_REDUCTION",
                  "WORK_LOCATION_CHANGE",
                  "SPONSORSHIP_ENDED",
                  "VISA_EXPIRING_90_DAYS",
                  "VISA_EXPIRING_30_DAYS",
                  "VISA_EXPIRING_7_DAYS",
                  "DOCUMENT_EXPIRING",
                  "WORKER_MISSING_DOCUMENTS",
                  "SALARY_DISCREPANCY",
                  "UNAUTHORISED_ABSENCE",
                ] as NotificationType[]
              ).map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {loading ? (
        <p>Yükleniyor...</p>
      ) : (
        <div className="rounded-md border border-slate-200 bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Çalışan</TableHead>
                <TableHead>Tip</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead>Urgency</TableHead>
                <TableHead>Rapor son tarihi</TableHead>
                <TableHead className="text-right">İşlem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    {r.worker.firstName} {r.worker.lastName}
                  </TableCell>
                  <TableCell className="text-xs">{r.eventType}</TableCell>
                  <TableCell>{r.status}</TableCell>
                  <TableCell>
                    <EscalationBadge
                      reportDeadlineAt={r.reportDeadlineAt}
                      dueDate={r.dueDate}
                      status={r.status}
                    />
                  </TableCell>
                  <TableCell className="text-xs">
                    <div>
                      {(r.reportDeadlineAt ?? r.dueDate) &&
                        new Date(
                          r.reportDeadlineAt ?? r.dueDate
                        ).toLocaleDateString("en-GB")}
                    </div>
                    <div className="text-slate-500">
                      {formatDeadlineWindowLabel(
                        r.eventType,
                        r.occurredAt,
                        r.reportDeadlineAt ?? r.dueDate
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {r.status === "PENDING" || r.status === "OVERDUE" ? (
                      <Button
                        size="sm"
                        variant="success"
                        type="button"
                        onClick={() => void complete(r.id)}
                      >
                        Tamamla
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
