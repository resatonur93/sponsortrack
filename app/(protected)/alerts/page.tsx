"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { AlertLevel, AlertType } from "@prisma/client";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertLevelDot } from "@/components/layout/AlertCountPill";

const LEVELS: AlertLevel[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

type AlertRow = {
  id: string;
  alertType: AlertType;
  level: AlertLevel;
  message: string;
  isRead: boolean;
  dismissedAt: string | null;
  createdAt: string;
  worker: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
};

export default function AlertsPage(): JSX.Element {
  const [rows, setRows] = useState<AlertRow[]>([]);
  const [meta, setMeta] = useState<{
    unreadCount: number;
    byLevel: Record<string, number>;
    byLevelUnread?: Record<string, number>;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [readFilter, setReadFilter] = useState<string>("all");

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    const q = new URLSearchParams();
    if (levelFilter !== "all") q.set("level", levelFilter);
    if (readFilter === "unread") q.set("isRead", "false");
    if (readFilter === "read") q.set("isRead", "true");
    q.set("limit", "200");
    const res = await fetch(`/api/alerts?${q}`, {
      credentials: "include",
      cache: "no-store",
    });
    setLoading(false);
    if (!res.ok) {
      setError("Yüklenemedi.");
      return;
    }
    const json = (await res.json()) as {
      data: AlertRow[];
      meta: { unreadCount: number; byLevel: Record<string, number> };
    };
    setRows(json.data);
    setMeta(json.meta);
    setError(null);
  }, [levelFilter, readFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  async function markRead(id: string): Promise<void> {
    const res = await fetch(`/api/alerts/${id}/read`, {
      method: "PUT",
      credentials: "include",
    });
    if (res.ok) void load();
  }

  async function dismiss(id: string): Promise<void> {
    const res = await fetch(`/api/alerts/${id}/dismiss`, {
      method: "PUT",
      credentials: "include",
    });
    if (res.ok) void load();
  }

  function badgeVariant(
    level: AlertLevel
  ): "danger" | "warning" | "success" | "outline" {
    if (level === "CRITICAL") return "danger";
    if (level === "HIGH") return "danger";
    if (level === "MEDIUM") return "warning";
    return "success";
  }

  if (error) {
    return <p className="text-red-600">{error}</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-navy">Uyarılar</h1>
        <p className="text-sm text-slate-600">
          Deadline kademeleri ve risk sinyalleri (cron ile güncellenir).
        </p>
      </div>

      {meta ? (
        <div className="flex flex-wrap gap-3 text-sm">
          <span className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1">
            <AlertLevelDot level="CRITICAL" />
            CRITICAL: {meta.byLevel.CRITICAL ?? 0}
          </span>
          <span className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1">
            <AlertLevelDot level="HIGH" />
            HIGH: {meta.byLevel.HIGH ?? 0}
          </span>
          <span className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1">
            <AlertLevelDot level="MEDIUM" />
            MEDIUM: {meta.byLevel.MEDIUM ?? 0}
          </span>
          <span className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1">
            <AlertLevelDot level="LOW" />
            LOW: {meta.byLevel.LOW ?? 0}
          </span>
          <span className="rounded-full bg-red-50 px-3 py-1 font-medium text-red-800">
            Okunmamış: {meta.unreadCount}
          </span>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtreler</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4 md:items-end">
          <div className="space-y-1">
            <Label>Seviye</Label>
            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tümü</SelectItem>
                {LEVELS.map((l) => (
                  <SelectItem key={l} value={l}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Okundu</Label>
            <Select value={readFilter} onValueChange={setReadFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tümü</SelectItem>
                <SelectItem value="unread">Okunmamış</SelectItem>
                <SelectItem value="read">Okunmuş</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="button" variant="outline" onClick={() => void load()} disabled={loading}>
            Yenile
          </Button>
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead>Tip</TableHead>
              <TableHead>Çalışan</TableHead>
              <TableHead>Seviye</TableHead>
              <TableHead>Mesaj</TableHead>
              <TableHead className="text-right">İşlem</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-slate-500">
                  Yükleniyor…
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-slate-500">
                  Kayıt yok.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <AlertLevelDot level={r.level} />
                  </TableCell>
                  <TableCell className="max-w-[140px] truncate text-xs">
                    {r.alertType}
                  </TableCell>
                  <TableCell>
                    {r.worker ? (
                      <Link
                        href={`/workers/${r.worker.id}`}
                        className="text-brand-navy underline"
                      >
                        {r.worker.firstName} {r.worker.lastName}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={badgeVariant(r.level)}>{r.level}</Badge>
                    {!r.isRead ? (
                      <span className="ml-1 text-xs text-red-600">yeni</span>
                    ) : null}
                  </TableCell>
                  <TableCell className="max-w-md text-sm text-slate-700">
                    {r.message}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-wrap justify-end gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={r.isRead}
                        onClick={() => void markRead(r.id)}
                      >
                        Okundu
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => void dismiss(r.id)}
                      >
                        Kapat
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
