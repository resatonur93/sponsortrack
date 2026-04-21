"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { EventStatus, EventType } from "@prisma/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const EVENT_TYPES: EventType[] = [
  "NO_SHOW_28_DAYS",
  "UNAUTHORISED_ABSENCE_10_DAYS",
  "REDUCED_PAY_ABSENCE",
  "SALARY_REDUCTION",
  "ROLE_CHANGE",
  "PROMOTION_SAME_CODE",
  "WORK_LOCATION_CHANGE",
  "SPONSORSHIP_ENDED",
  "OFFSHORE_ARRIVAL",
  "OFFSHORE_DEPARTURE",
  "ADDRESS_CHANGE",
  "PHONE_CHANGE",
  "EMAIL_CHANGE",
];

const EVENT_STATUSES: EventStatus[] = [
  "PENDING",
  "UNDER_REVIEW",
  "APPROVED",
  "REPORTED",
  "OVERDUE",
  "CANCELLED",
];

type EventRow = {
  id: string;
  eventType: EventType;
  eventDate: string;
  reportDeadline: string;
  status: EventStatus;
  evidenceRequired: string[];
  smsDraft: string | null;
  notes: string | null;
  worker: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    cosReference: string;
  };
};

export default function EventsPage(): JSX.Element {
  const [rows, setRows] = useState<EventRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<EventRow | null>(null);

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [manualWorkerId, setManualWorkerId] = useState("");
  const [manualType, setManualType] = useState<EventType>("SALARY_REDUCTION");
  const [manualSubmitting, setManualSubmitting] = useState(false);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    const q = new URLSearchParams();
    if (statusFilter !== "all") q.set("status", statusFilter);
    if (typeFilter !== "all") q.set("eventType", typeFilter);
    if (dateFrom) q.set("dateFrom", dateFrom);
    if (dateTo) q.set("dateTo", dateTo);
    const res = await fetch(`/api/events?${q}`, { credentials: "include" });
    setLoading(false);
    if (!res.ok) {
      setError("Liste yüklenemedi.");
      return;
    }
    const json = (await res.json()) as { data: EventRow[] };
    setRows(json.data);
    setError(null);
  }, [statusFilter, typeFilter, dateFrom, dateTo]);

  useEffect(() => {
    void load();
  }, [load]);

  async function approve(id: string): Promise<void> {
    const res = await fetch(`/api/events/${id}/approve`, {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) {
      alert("Onaylanamadı.");
      return;
    }
    void load();
    setDetail(null);
  }

  async function report(id: string): Promise<void> {
    const res = await fetch(`/api/events/${id}/report`, {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) {
      alert("Güncellenemedi.");
      return;
    }
    void load();
    setDetail(null);
  }

  async function submitManual(): Promise<void> {
    if (!manualWorkerId.trim()) {
      alert("Worker ID gerekli.");
      return;
    }
    setManualSubmitting(true);
    const res = await fetch("/api/events", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workerId: manualWorkerId.trim(),
        eventType: manualType,
      }),
    });
    setManualSubmitting(false);
    if (!res.ok) {
      const j = (await res.json()) as { error?: string };
      alert(j.error ?? "Oluşturulamadı.");
      return;
    }
    setManualWorkerId("");
    void load();
  }

  if (error) {
    return <p className="text-rose-600">{error}</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-navy">Event reporting</h1>
        <p className="text-sm text-slate-600">
          Sponsor raporlama son tarihleri (UK iş günü / no-show takvim günü).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 md:flex-row md:flex-wrap md:items-end">
          <div className="space-y-1">
            <Label>Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {EVENT_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Event type</Label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[260px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {EVENT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Event date from</Label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-[160px]"
            />
          </div>
          <div className="space-y-1">
            <Label>Event date to</Label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-[160px]"
            />
          </div>
          <Button type="button" onClick={() => void load()} disabled={loading}>
            Apply
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Manual event</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1">
            <Label>Worker ID</Label>
            <Input
              value={manualWorkerId}
              onChange={(e) => setManualWorkerId(e.target.value)}
              placeholder="cuid..."
            />
          </div>
          <div className="w-full space-y-1 sm:w-64">
            <Label>Type</Label>
            <Select
              value={manualType}
              onValueChange={(v) => setManualType(v as EventType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EVENT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            type="button"
            disabled={manualSubmitting}
            onClick={() => void submitManual()}
          >
            Create
          </Button>
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Worker</TableHead>
              <TableHead>Event date</TableHead>
              <TableHead>Deadline</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-slate-500">
                  Loading…
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-slate-500">
                  No events.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="max-w-[200px] truncate text-xs font-medium">
                    {r.eventType}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/workers/${r.worker.id}`}
                      className="text-brand-navy underline"
                    >
                      {r.worker.firstName} {r.worker.lastName}
                    </Link>
                    <div className="text-xs text-slate-500">{r.worker.email}</div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm">
                    {fmtDate(r.eventDate)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm">
                    {fmtDate(r.reportDeadline)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(r.status)}>{r.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-wrap justify-end gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setDetail(r)}
                      >
                        Details
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={
                          r.status === "CANCELLED" ||
                          r.status === "REPORTED" ||
                          r.status === "APPROVED"
                        }
                        onClick={() => void approve(r.id)}
                      >
                        Approve
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        disabled={
                          r.status === "CANCELLED" || r.status === "REPORTED"
                        }
                        onClick={() => void report(r.id)}
                      >
                        Report
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {detail ? (
        <Card className="border-brand-navy/30">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Event detail</CardTitle>
            <Button type="button" variant="ghost" size="sm" onClick={() => setDetail(null)}>
              Close
            </Button>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              <span className="text-slate-500">Type:</span> {detail.eventType}
            </p>
            <p>
              <span className="text-slate-500">Worker:</span>{" "}
              <Link href={`/workers/${detail.worker.id}`} className="underline">
                {detail.worker.firstName} {detail.worker.lastName}
              </Link>{" "}
              · {detail.worker.cosReference}
            </p>
            <div>
              <p className="text-slate-500">Evidence required</p>
              <ul className="mt-1 list-inside list-disc">
                {detail.evidenceRequired.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </div>
            {detail.smsDraft ? (
              <div>
                <p className="text-slate-500">SMS draft</p>
                <pre className="mt-1 whitespace-pre-wrap rounded bg-slate-50 p-3 text-xs">
                  {detail.smsDraft}
                </pre>
              </div>
            ) : null}
            {detail.notes ? (
              <p>
                <span className="text-slate-500">Notes:</span> {detail.notes}
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function statusVariant(
  s: EventStatus
): "success" | "warning" | "danger" | "outline" | "default" {
  switch (s) {
    case "REPORTED":
      return "success";
    case "OVERDUE":
      return "danger";
    case "APPROVED":
      return "default";
    case "CANCELLED":
      return "outline";
    case "UNDER_REVIEW":
      return "warning";
    default:
      return "warning";
  }
}
