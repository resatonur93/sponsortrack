"use client";

import Link from "next/link";
import { ClipboardList } from "lucide-react";
import type { AdminDashboardRecentLead } from "@/lib/admin/dashboard-types";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LeadStatusBadge } from "@/components/admin/LeadStatusBadge";

export function AdminRecentLeadsTable(props: {
  rows: AdminDashboardRecentLead[];
  localeTag: string;
  t: (key: string) => string;
  labelStatus: (s: AdminDashboardRecentLead["status"]) => string;
}): JSX.Element {
  const leadDisplayName = (r: AdminDashboardRecentLead) => {
    const n = [r.name?.trim()].filter(Boolean).join(" ").trim();
    const co = r.companyName?.trim();
    if (n && co) return `${n} — ${co}`;
    if (n) return n;
    if (co) return co;
    return r.email;
  };

  const formatDt = (iso: string) =>
    new Date(iso).toLocaleString(props.localeTag, {
      dateStyle: "medium",
      timeStyle: "short",
    });

  return (
    <div className="overflow-hidden rounded-2xl border border-brand-navy/12 bg-white shadow-card ring-1 ring-brand-navy/5">
      <div className="border-b border-brand-navy/10 bg-gradient-to-r from-brand-navy/[0.07] via-white to-sky-50/40 px-5 py-4">
        <h2 className="text-base font-bold text-brand-navy">{props.t("admin.dashboard.table.title")}</h2>
      </div>
      {props.rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-navy/10 text-brand-navy shadow-inner ring-2 ring-brand-navy/15">
            <ClipboardList className="h-8 w-8" aria-hidden strokeWidth={1.75} />
          </div>
          <p className="max-w-md text-base font-semibold text-brand-navy">{props.t("admin.dashboard.table.emptyTitle")}</p>
          <p className="mt-2 max-w-md text-sm text-brand-slate">{props.t("admin.dashboard.table.emptyHint")}</p>
          <Button asChild className="mt-8 bg-brand-navy font-semibold shadow-md hover:bg-brand-navy/90">
            <Link href="/admin/leads">{props.t("admin.dashboard.ctaBrowseLeads")}</Link>
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-brand-navy/10 bg-slate-50/90 hover:bg-slate-50/90">
                <TableHead className="font-bold text-brand-navy">{props.t("admin.dashboard.table.colLead")}</TableHead>
                <TableHead className="font-bold text-brand-navy">{props.t("admin.dashboard.table.colSource")}</TableHead>
                <TableHead className="font-bold text-brand-navy">{props.t("admin.dashboard.table.colStatus")}</TableHead>
                <TableHead className="font-bold text-brand-navy">{props.t("admin.dashboard.table.colCreated")}</TableHead>
                <TableHead className="font-bold text-brand-navy">{props.t("admin.dashboard.table.colLastAction")}</TableHead>
                <TableHead className="w-[1%] whitespace-nowrap text-right font-bold text-brand-navy">
                  {props.t("admin.dashboard.table.colAction")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {props.rows.map((r) => (
                <TableRow key={r.id} className="border-brand-navy/[0.07] hover:bg-brand-navy/[0.03]">
                  <TableCell>
                    <div className="min-w-[180px]">
                      <Link
                        href={`/admin/leads/${r.id}`}
                        className="font-semibold text-brand-navy underline decoration-brand-navy/25 underline-offset-2 hover:decoration-brand-navy"
                      >
                        {leadDisplayName(r)}
                      </Link>
                      <p className="text-xs text-brand-slate">{r.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex rounded-md border border-sky-200/80 bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-900">
                      {r.source}
                    </span>
                  </TableCell>
                  <TableCell>
                    <LeadStatusBadge status={r.status} label={props.labelStatus(r.status)} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-slate-700">{formatDt(r.createdAt)}</TableCell>
                  <TableCell className="max-w-[220px]">
                    {r.lastAction ? (
                      <div className="space-y-0.5">
                        <p className="line-clamp-2 text-sm text-slate-800">{r.lastAction.summary}</p>
                        <p className="text-[11px] text-brand-slate">{formatDt(r.lastAction.at)}</p>
                      </div>
                    ) : (
                      <span className="text-sm text-brand-slate">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild size="sm" variant="outline" className="border-brand-navy/25 font-semibold text-brand-navy">
                      <Link href={`/admin/leads/${r.id}`}>{props.t("common.details")}</Link>
                    </Button>
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
