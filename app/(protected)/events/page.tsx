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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

type HoSmsDraft = {
  id: string;
  smsText: string;
  evidenceChecklist: string[];
  deadline: string;
  internalNotes: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  sentToHO: boolean;
  sentAt: string | null;
  createdAt: string;
  event: {
    id: string;
    eventType: EventType;
    worker: {
      id: string;
      firstName: string;
      lastName: string;
      cosReference: string;
    };
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

  const [hoSmsEvent, setHoSmsEvent] = useState<EventRow | null>(null);
  const [hoSmsDraft, setHoSmsDraft] = useState<HoSmsDraft | null>(null);
  const [hoSmsPhase, setHoSmsPhase] = useState<"prepare" | "loading" | "review">(
    "prepare"
  );
  const [hoSmsNotes, setHoSmsNotes] = useState("");
  const [hoSmsBusy, setHoSmsBusy] = useState(false);
  const [hoSmsError, setHoSmsError] = useState<string | null>(null);

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

  function openHoSmsModal(row: EventRow): void {
    setHoSmsEvent(row);
    setHoSmsDraft(null);
    setHoSmsPhase("prepare");
    setHoSmsNotes("");
    setHoSmsError(null);
  }

  function closeHoSmsModal(): void {
    setHoSmsEvent(null);
    setHoSmsDraft(null);
    setHoSmsPhase("prepare");
    setHoSmsNotes("");
    setHoSmsError(null);
  }

  async function generateHoSmsDraft(): Promise<void> {
    if (!hoSmsEvent) return;
    setHoSmsPhase("loading");
    setHoSmsError(null);
    try {
      const res = await fetch(`/api/events/${hoSmsEvent.id}/generate-sms`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          internalNotes: hoSmsNotes.trim() || null,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        data?: HoSmsDraft;
        error?: string;
      };
      if (!res.ok) {
        setHoSmsError(json.error ?? "Could not generate SMS draft");
        setHoSmsPhase("prepare");
        return;
      }
      if (json.data) {
        setHoSmsDraft(json.data);
        setHoSmsPhase("review");
        void load();
      }
    } finally {
      /* phase set above */
    }
  }

  async function approveHoSmsDraft(): Promise<void> {
    if (!hoSmsDraft) return;
    setHoSmsBusy(true);
    setHoSmsError(null);
    try {
      const res = await fetch(`/api/sms-drafts/${hoSmsDraft.id}/approve`, {
        method: "PUT",
        credentials: "include",
      });
      const json = (await res.json().catch(() => ({}))) as {
        data?: HoSmsDraft;
        error?: string;
      };
      if (!res.ok) {
        setHoSmsError(json.error ?? "Approve failed");
        return;
      }
      if (json.data) setHoSmsDraft(json.data);
    } finally {
      setHoSmsBusy(false);
    }
  }

  async function markHoSmsSent(): Promise<void> {
    if (!hoSmsDraft) return;
    setHoSmsBusy(true);
    setHoSmsError(null);
    try {
      const res = await fetch(`/api/sms-drafts/${hoSmsDraft.id}/mark-sent`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = (await res.json().catch(() => ({}))) as {
        data?: HoSmsDraft;
        error?: string;
      };
      if (!res.ok) {
        setHoSmsError(json.error ?? "Update failed");
        return;
      }
      if (json.data) setHoSmsDraft(json.data);
    } finally {
      setHoSmsBusy(false);
    }
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
                        variant="secondary"
                        onClick={() => openHoSmsModal(r)}
                      >
                        Generate SMS
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

      <Dialog
        open={hoSmsEvent !== null}
        onOpenChange={(open) => {
          if (!open) closeHoSmsModal();
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>HO SMS draft</DialogTitle>
          </DialogHeader>
          {hoSmsEvent ? (
            <div className="space-y-4 text-sm">
              <p className="text-slate-600">
                <span className="font-medium text-slate-800">Event:</span>{" "}
                {hoSmsEvent.eventType} · {hoSmsEvent.worker.firstName}{" "}
                {hoSmsEvent.worker.lastName} ({hoSmsEvent.worker.cosReference})
              </p>
              {hoSmsError ? (
                <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-red-800">
                  {hoSmsError}
                </p>
              ) : null}

              {hoSmsPhase === "prepare" ? (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label>Internal notes (optional)</Label>
                    <textarea
                      value={hoSmsNotes}
                      onChange={(e) => setHoSmsNotes(e.target.value)}
                      placeholder="Context for approvers only — not sent to HO"
                      className="min-h-[80px] w-full rounded-md border border-slate-300 p-2 text-sm"
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={() => void generateHoSmsDraft()}
                  >
                    Generate draft
                  </Button>
                </div>
              ) : null}

              {hoSmsPhase === "loading" ? (
                <p className="text-slate-500">Generating…</p>
              ) : null}

              {hoSmsPhase === "review" && hoSmsDraft ? (
                <div className="space-y-4 border-t border-slate-100 pt-4">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Review — SMS text
                    </p>
                    <pre className="mt-2 whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900">
                      {hoSmsDraft.smsText}
                    </pre>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Evidence checklist
                    </p>
                    <ul className="mt-2 list-inside list-disc text-slate-700">
                      {hoSmsDraft.evidenceChecklist.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">
                      Deadline: {fmtDate(hoSmsDraft.deadline)}
                    </Badge>
                    {hoSmsDraft.approvedAt ? (
                      <Badge variant="success">Approved</Badge>
                    ) : (
                      <Badge variant="warning">Awaiting approval</Badge>
                    )}
                    {hoSmsDraft.sentToHO ? (
                      <Badge variant="success">Sent to HO</Badge>
                    ) : null}
                  </div>
                  {hoSmsDraft.internalNotes ? (
                    <p className="text-xs text-slate-600">
                      <span className="font-medium">Internal notes:</span>{" "}
                      {hoSmsDraft.internalNotes}
                    </p>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    {!hoSmsDraft.approvedAt ? (
                      <Button
                        type="button"
                        disabled={hoSmsBusy}
                        onClick={() => void approveHoSmsDraft()}
                      >
                        Approve draft
                      </Button>
                    ) : null}
                    {hoSmsDraft.approvedAt && !hoSmsDraft.sentToHO ? (
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={hoSmsBusy}
                        onClick={() => void markHoSmsSent()}
                      >
                        Mark sent to HO
                      </Button>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
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
