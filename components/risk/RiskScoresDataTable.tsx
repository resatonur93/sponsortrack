"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { RiskReportRow } from "@/lib/risk/report";
import { cn } from "@/lib/utils";

type Translator = (key: string) => string;

function workerInitials(first: string, last: string): string {
  const a = first.trim().charAt(0);
  const b = last.trim().charAt(0);
  return `${a}${b}`.toUpperCase() || "?";
}

function riskLevelPillClass(level: RiskReportRow["level"]): string {
  switch (level) {
    case "LOW":
      return "border-emerald-400 bg-emerald-50 text-emerald-950";
    case "MEDIUM":
      return "border-amber-400 bg-amber-50 text-amber-950";
    case "HIGH":
      return "border-orange-500 bg-orange-50 text-orange-950";
    case "CRITICAL":
      return "border-red-600 bg-red-50 text-red-950";
    default:
      return "border-slate-300 bg-slate-50 text-slate-800";
  }
}

function scoreDisplayClass(level: RiskReportRow["level"]): string {
  switch (level) {
    case "LOW":
      return "text-emerald-700";
    case "MEDIUM":
      return "text-amber-700";
    case "HIGH":
      return "text-orange-700";
    case "CRITICAL":
      return "text-red-700";
    default:
      return "text-brand-navy";
  }
}

function employmentBadgeClass(s: string): string {
  switch (s) {
    case "ACTIVE":
      return "border-emerald-300 bg-emerald-50 text-emerald-900";
    case "PENDING_START":
      return "border-sky-300 bg-sky-50 text-sky-900";
    case "SUSPENDED":
      return "border-amber-300 bg-amber-50 text-amber-900";
    case "TERMINATED":
      return "border-slate-300 bg-slate-100 text-slate-700";
    default:
      return "border-slate-200 bg-white text-slate-700";
  }
}

function SortButton(props: {
  label: string;
  column: {
    getIsSorted: () => false | "asc" | "desc";
    toggleSorting: (desc?: boolean) => void;
  };
}): JSX.Element {
  const sorted = props.column.getIsSorted();
  return (
    <Button
      type="button"
      variant="ghost"
      className="-ml-3 h-8 gap-1 px-2 text-left font-bold text-brand-navy hover:bg-brand-navy/[0.06]"
      onClick={() => props.column.toggleSorting(sorted === "asc")}
    >
      {props.label}
      {sorted === "asc" ? (
        <ArrowUp className="h-3.5 w-3.5 opacity-70" aria-hidden />
      ) : sorted === "desc" ? (
        <ArrowDown className="h-3.5 w-3.5 opacity-70" aria-hidden />
      ) : (
        <ArrowUpDown className="h-3.5 w-3.5 opacity-40" aria-hidden />
      )}
    </Button>
  );
}

function buildColumns(
  t: Translator,
  tEmployment: (status: string) => string,
  localeTag: string
): ColumnDef<RiskReportRow>[] {
  return [
    {
      id: "rank",
      header: () => <span className="pl-1 text-xs font-bold text-slate-500">#</span>,
      cell: ({ row }) => (
        <span className="pl-1 tabular-nums text-sm text-slate-500">{row.index + 1}</span>
      ),
      enableSorting: false,
    },
    {
      accessorFn: (row) =>
        row.worker
          ? `${row.worker.lastName} ${row.worker.firstName} ${row.worker.email}`.toLowerCase()
          : "",
      id: "worker",
      header: ({ column }) => <SortButton label={t("risk.report.table.worker")} column={column} />,
      cell: ({ row }) => {
        const w = row.original.worker;
        if (!w) return <span className="text-slate-400">—</span>;
        return (
          <div className="flex items-center gap-3 py-1">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-navy/15 to-brand-navy/5 text-xs font-bold text-brand-navy ring-1 ring-brand-navy/15"
              aria-hidden
            >
              {workerInitials(w.firstName, w.lastName)}
            </div>
            <div className="min-w-0">
              <Link
                href={`/workers/${w.id}`}
                className="block truncate font-semibold text-brand-navy underline decoration-brand-navy/25 underline-offset-2 hover:decoration-brand-navy"
              >
                {w.firstName} {w.lastName}
              </Link>
              <p className="truncate text-xs text-slate-500">{w.email}</p>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "score",
      header: ({ column }) => <SortButton label={t("risk.report.table.score")} column={column} />,
      cell: ({ row }) => (
        <span
          className={cn(
            "text-2xl font-bold tabular-nums tracking-tight",
            scoreDisplayClass(row.original.level)
          )}
        >
          {row.original.score}
        </span>
      ),
    },
    {
      accessorKey: "level",
      header: ({ column }) => <SortButton label={t("risk.report.table.level")} column={column} />,
      cell: ({ row }) => (
        <span
          className={cn(
            "inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide",
            riskLevelPillClass(row.original.level)
          )}
        >
          {t(`risk.report.riskLevel.${row.original.level}`)}
        </span>
      ),
    },
    {
      accessorFn: (row) => row.worker?.employmentStatus ?? "",
      id: "status",
      header: ({ column }) => <SortButton label={t("risk.report.table.status")} column={column} />,
      cell: ({ row }) => {
        const s = row.original.worker?.employmentStatus;
        if (!s) return <span className="text-slate-400">—</span>;
        const label = tEmployment(s);
        return (
          <span
            className={cn(
              "inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold",
              employmentBadgeClass(s)
            )}
          >
            {label}
          </span>
        );
      },
    },
    {
      accessorKey: "calculatedAt",
      header: ({ column }) => <SortButton label={t("risk.report.table.calculated")} column={column} />,
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-sm text-slate-700">
          {new Date(row.original.calculatedAt).toLocaleString(localeTag, {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        </span>
      ),
    },
  ];
}

export function RiskScoresDataTable(props: {
  data: RiskReportRow[];
  t: Translator;
  localeTag: string;
}): JSX.Element {
  const { data, t: tr, localeTag } = props;
  const [sorting, setSorting] = useState<SortingState>([{ id: "score", desc: true }]);

  const tEmployment = useMemo(
    () => (status: string) => {
      const key = `workerDetail.employment.${status}`;
      const v = tr(key);
      return v === key ? status : v;
    },
    [tr]
  );

  const columns = useMemo(
    () => buildColumns(tr, tEmployment, localeTag),
    [tr, tEmployment, localeTag]
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-inner">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((hg) => (
            <TableRow key={hg.id} className="border-slate-200 bg-slate-50/90 hover:bg-slate-50/90">
              {hg.headers.map((h) => (
                <TableHead key={h.id} className="align-middle">
                  {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id} className="border-slate-100 hover:bg-brand-navy/[0.03]">
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id} className="align-middle">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
