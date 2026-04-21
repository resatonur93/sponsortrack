"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { RiskLevel } from "@prisma/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

type Row = {
  id: string;
  score: number;
  level: RiskLevel;
  calculatedAt: string;
  factors: unknown;
  worker: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    employmentStatus: string;
  } | null;
};

function levelVariant(
  l: RiskLevel
): "success" | "warning" | "danger" | "outline" {
  switch (l) {
    case "LOW":
      return "success";
    case "MEDIUM":
      return "warning";
    case "HIGH":
    case "CRITICAL":
      return "danger";
    default:
      return "outline";
  }
}

export default function RiskReportPage(): JSX.Element {
  const [level, setLevel] = useState<string>("all");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    const q = level !== "all" ? `?level=${level}` : "";
    const res = await fetch(`/api/risk-scores${q}`, {
      credentials: "include",
      cache: "no-store",
    });
    setLoading(false);
    if (!res.ok) {
      setError("Liste yüklenemedi.");
      return;
    }
    const json = (await res.json()) as { data: Row[] };
    setRows(json.data);
  }, [level]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy">Risk report</h1>
          <p className="text-sm text-slate-600">
            Workers ranked by automated risk score (nightly cron + on-demand
            refresh).
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label>Level</Label>
            <Select value={level} onValueChange={setLevel}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="LOW">LOW</SelectItem>
                <SelectItem value="MEDIUM">MEDIUM</SelectItem>
                <SelectItem value="HIGH">HIGH</SelectItem>
                <SelectItem value="CRITICAL">CRITICAL</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="button" variant="outline" onClick={() => void load()}>
            Refresh
          </Button>
        </div>
      </div>

      {error ? <p className="text-red-600">{error}</p> : null}

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Worker</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Level</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Calculated</TableHead>
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
                  No risk scores yet — run{" "}
                  <code className="text-xs">/api/cron/risk-scores</code> or open
                  a worker with refresh.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r, i) => (
                <TableRow key={r.id}>
                  <TableCell className="text-slate-500">{i + 1}</TableCell>
                  <TableCell>
                    {r.worker ? (
                      <>
                        <Link
                          href={`/workers/${r.worker.id}`}
                          className="font-medium text-brand-navy underline"
                        >
                          {r.worker.firstName} {r.worker.lastName}
                        </Link>
                        <div className="text-xs text-slate-500">
                          {r.worker.email}
                        </div>
                      </>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="font-mono tabular-nums">{r.score}</TableCell>
                  <TableCell>
                    <Badge variant={levelVariant(r.level)}>{r.level}</Badge>
                  </TableCell>
                  <TableCell className="text-xs">
                    {r.worker?.employmentStatus ?? "—"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-slate-600">
                    {new Date(r.calculatedAt).toLocaleString("en-GB")}
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
