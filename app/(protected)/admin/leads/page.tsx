"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import type { LeadStatus } from "@prisma/client";
import { Inbox, Plus, Search } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LeadStatusBadge } from "@/components/admin/LeadStatusBadge";
import {
  AdminEmptyState,
  AdminFilterBar,
  AdminPageHeader,
  AdminTablePanel,
  initialsFromName,
} from "@/components/admin/shell/AdminPageShell";
import { useTranslation } from "@/contexts/LanguageContext";

type LeadRow = {
  id: string;
  email: string;
  companyName: string | null;
  name: string | null;
  phone: string | null;
  status: LeadStatus;
  source: string;
  createdAt: string;
};

const STATUSES: LeadStatus[] = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "DEMO_SCHEDULED",
  "CONVERTED",
  "LOST",
];

function leadInitials(row: LeadRow): string {
  if (row.name?.trim()) {
    const parts = row.name.trim().split(/\s+/);
    const first = parts[0];
    const last = parts.slice(1).join(" ");
    return initialsFromName(first, last || null, row.email);
  }
  return initialsFromName(null, null, row.email);
}

function leadPrimaryLabel(row: LeadRow): string {
  const n = row.name?.trim();
  const co = row.companyName?.trim();
  if (n && co) return `${n} · ${co}`;
  if (n) return n;
  if (co) return co;
  return row.email;
}

function paginateHint(t: (k: string) => string, total: number, page: number, pages: number): string {
  return t("admin.leads.pagination")
    .replace(/\{\{\s*total\s*\}\}/g, String(total))
    .replace(/\{\{\s*page\s*\}\}/g, String(page))
    .replace(/\{\{\s*pages\s*\}\}/g, String(pages));
}

function AdminLeadsInner(): JSX.Element {
  const { t, locale } = useTranslation();
  const localeTag = locale === "tr" ? "tr-TR" : "en-GB";
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [rows, setRows] = useState<LeadRow[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20 });
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") ?? "all");
  const [sourceFilter, setSourceFilter] = useState(searchParams.get("source") ?? "all");
  const [searchDraft, setSearchDraft] = useState(searchParams.get("search") ?? "");
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [page, setPage] = useState(parseInt(searchParams.get("page") ?? "1", 10) || 1);

  const load = useCallback(async (): Promise<void> => {
    const q = new URLSearchParams();
    if (statusFilter !== "all") q.set("status", statusFilter);
    if (sourceFilter !== "all") q.set("source", sourceFilter);
    if (search.trim()) q.set("search", search.trim());
    q.set("page", String(page));
    q.set("limit", "20");
    const res = await fetch(`/api/admin/leads?${q}`, {
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) {
      setError(t("admin.leads.errorLoad"));
      return;
    }
    const json = (await res.json()) as {
      data: LeadRow[];
      meta: { total: number; page: number; limit: number };
    };
    setRows(json.data);
    setMeta(json.meta);
    setError(null);
  }, [statusFilter, sourceFilter, search, page, t]);

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      router.replace("/login");
      return;
    }
    if (!session?.user?.canAccessAdminPanel) {
      router.replace("/dashboard");
      return;
    }
    void load();
  }, [status, session?.user?.canAccessAdminPanel, router, load]);

  if (status === "loading" || !session) {
    return (
      <p className="text-brand-slate" role="status">
        {t("common.loading")}
      </p>
    );
  }
  if (!session.user.canAccessAdminPanel) {
    return <p className="text-brand-slate">{t("common.loading")}</p>;
  }
  if (error) {
    return (
      <div className="space-y-4 rounded-xl border border-red-200 bg-red-50/90 p-6">
        <p className="font-medium text-red-900">{error}</p>
        <Button variant="outline" onClick={() => void load()} className="border-brand-navy/25">
          {t("admin.common.retry")}
        </Button>
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil(meta.total / meta.limit));

  const headerActions = (
    <>
      <Button asChild className="bg-brand-navy font-bold shadow-md hover:bg-brand-navy/92">
        <Link href="/admin/leads/new">
          <Plus className="mr-2 h-4 w-4" aria-hidden />
          {t("admin.leads.addNew")}
        </Link>
      </Button>
    </>
  );

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-8">
      <AdminPageHeader
        title={t("admin.leads.title")}
        subtitle={t("admin.leads.subtitle")}
        actions={headerActions}
      />

      <AdminFilterBar>
        <div className="w-full space-y-1.5 md:w-[220px]">
          <Label className="text-xs font-bold uppercase tracking-wide text-brand-slate">{t("admin.leads.filterStatus")}</Label>
          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setPage(1);
              setStatusFilter(v);
            }}
          >
            <SelectTrigger className="h-11 border-brand-navy/15 bg-white font-medium shadow-inner">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("common.all")}</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {t(`admin.leadStatus.${s}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-full space-y-1.5 md:w-[220px]">
          <Label className="text-xs font-bold uppercase tracking-wide text-brand-slate">{t("admin.leads.filterSource")}</Label>
          <Select
            value={sourceFilter}
            onValueChange={(v) => {
              setPage(1);
              setSourceFilter(v);
            }}
          >
            <SelectTrigger className="h-11 border-brand-navy/15 bg-white font-medium shadow-inner">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("common.all")}</SelectItem>
              <SelectItem value="demo_request">demo_request</SelectItem>
              <SelectItem value="homepage">homepage</SelectItem>
              <SelectItem value="contact_form">contact_form</SelectItem>
              <SelectItem value="admin_manual">admin_manual</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-[220px] flex-1 space-y-1.5">
          <Label className="text-xs font-bold uppercase tracking-wide text-brand-slate">{t("admin.leads.searchLabel")}</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-slate/60" aria-hidden />
            <Input
              className="h-11 border-brand-navy/15 bg-white pl-10 shadow-inner"
              value={searchDraft}
              placeholder={t("admin.leads.searchPh")}
              onChange={(e) => setSearchDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setSearch(searchDraft);
                  setPage(1);
                }
              }}
            />
          </div>
        </div>
        <Button
          type="button"
          className="h-11 bg-brand-navy px-8 font-bold hover:bg-brand-navy/92"
          onClick={() => {
            setSearch(searchDraft);
            setPage(1);
          }}
        >
          {t("admin.common.apply")}
        </Button>
      </AdminFilterBar>

      {rows.length === 0 ? (
        <AdminEmptyState
          icon={<Inbox aria-hidden />}
          title={t("admin.leads.emptyTitle")}
          description={t("admin.leads.emptyHint")}
          primaryAction={
            <Button asChild className="bg-brand-navy px-8 font-bold shadow-lg hover:bg-brand-navy/92">
              <Link href="/admin/leads/new">
                <Plus className="mr-2 h-4 w-4" aria-hidden />
                {t("admin.leads.addNew")}
              </Link>
            </Button>
          }
        />
      ) : (
        <AdminTablePanel title={t("admin.leads.tableTitle")}>
          <Table>
            <TableHeader>
              <TableRow className="border-brand-navy/10 bg-slate-50/95 hover:bg-slate-50/95">
                <TableHead className="font-bold text-brand-navy">{t("admin.leads.colPerson")}</TableHead>
                <TableHead className="font-bold text-brand-navy">{t("admin.leads.colEmail")}</TableHead>
                <TableHead className="font-bold text-brand-navy">{t("admin.leads.colStatus")}</TableHead>
                <TableHead className="font-bold text-brand-navy">{t("admin.leads.colSource")}</TableHead>
                <TableHead className="font-bold text-brand-navy">{t("admin.leads.colDate")}</TableHead>
                <TableHead className="text-right font-bold text-brand-navy">{t("admin.leads.colAction")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id} className="border-brand-navy/[0.07] transition-colors hover:bg-brand-navy/[0.035]">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-navy/[0.1] text-xs font-bold text-brand-navy ring-2 ring-brand-navy/10"
                        aria-hidden
                      >
                        {leadInitials(r)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-brand-navy">{leadPrimaryLabel(r)}</p>
                        {(r.companyName ?? r.name) ? (
                          <p className="truncate text-xs text-brand-slate">{r.email}</p>
                        ) : null}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-slate-700">{r.email}</TableCell>
                  <TableCell>
                    <LeadStatusBadge status={r.status} label={t(`admin.leadStatus.${r.status}`)} />
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex rounded-md border border-sky-200/80 bg-sky-50 px-2 py-1 text-[11px] font-semibold text-sky-900">
                      {r.source}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-brand-slate">
                    {new Date(r.createdAt).toLocaleString(localeTag, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" className="border-brand-navy/25 font-semibold text-brand-navy" asChild>
                      <Link href={`/admin/leads/${r.id}`}>{t("common.details")}</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </AdminTablePanel>
      )}

      {rows.length > 0 ? (
        <div className="flex flex-col gap-3 border-t border-brand-navy/10 pt-2 text-sm text-brand-slate sm:flex-row sm:items-center sm:justify-between">
          <span>{paginateHint(t, meta.total, meta.page, totalPages)}</span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-brand-navy/20"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              {t("admin.common.prev")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-brand-navy/20"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              {t("admin.common.next")}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function AdminLeadsPage(): JSX.Element {
  const { t } = useTranslation();
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[30vh] items-center justify-center text-brand-slate" role="status">
          {t("common.loading")}
        </div>
      }
    >
      <AdminLeadsInner />
    </Suspense>
  );
}
