"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { WorkerTable } from "@/components/workers/WorkerTable";
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
import { useTranslation } from "@/contexts/LanguageContext";
import type { WorkerListFilter, WorkerListItem } from "@/lib/workers/types";

const FILTER_OPTIONS: { value: WorkerListFilter; labelKey: string }[] = [
  { value: "all", labelKey: "workers.filter.all" },
  { value: "active", labelKey: "workers.filter.active" },
  {
    value: "pending_onboarding",
    labelKey: "workers.filter.pendingOnboarding",
  },
  { value: "visa_expiring", labelKey: "workers.filter.visaExpiring" },
  { value: "visa_expired", labelKey: "workers.filter.visaExpired" },
  { value: "suspended", labelKey: "workers.filter.suspended" },
  { value: "terminated", labelKey: "workers.filter.terminated" },
];

export default function WorkersPage(): JSX.Element {
  const { t } = useTranslation();
  const [workers, setWorkers] = useState<WorkerListItem[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [listFilter, setListFilter] = useState<WorkerListFilter>("all");
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(
      () => setDebouncedSearch(search.trim()),
      320
    );
    return () => window.clearTimeout(id);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    const q = new URLSearchParams();
    if (debouncedSearch) q.set("search", debouncedSearch);
    if (listFilter !== "all") q.set("filter", listFilter);
    void (async () => {
      setLoading(true);
      setLoadFailed(false);
      const res = await fetch(`/api/workers?${q.toString()}`, {
        credentials: "include",
        cache: "no-store",
      });
      if (cancelled) return;
      if (res.ok) {
        const json = (await res.json()) as { data: WorkerListItem[] };
        setWorkers(json.data);
      } else {
        setLoadFailed(true);
        setWorkers([]);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, listFilter]);

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-brand-navy sm:text-2xl">
            {t("workers.title")}
          </h1>
          <p className="text-sm text-slate-600">{t("workers.subtitle")}</p>
        </div>
        {/* Desktop CTA — hidden on mobile (FAB covers it) */}
        <Link href="/workers/new" className="hidden sm:block">
          <Button>{t("workers.new")}</Button>
        </Link>
      </div>

      {/* Search + filter row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1 space-y-1.5">
          <Label htmlFor="workers-search" className="text-sm text-slate-600">
            {t("workers.searchLabel")}
          </Label>
          <Input
            id="workers-search"
            type="search"
            placeholder={t("workers.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            className="h-11"
          />
        </div>
        <div className="w-full space-y-1.5 sm:w-52">
          <Label htmlFor="workers-status" className="text-sm text-slate-600">
            {t("workers.statusLabel")}
          </Label>
          <Select
            value={listFilter}
            onValueChange={(v) => setListFilter(v as WorkerListFilter)}
          >
            <SelectTrigger
              id="workers-status"
              aria-label={t("workers.statusLabel")}
              className="h-11"
            >
              <SelectValue placeholder={t("workers.statusLabel")} />
            </SelectTrigger>
            <SelectContent>
              {FILTER_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {t(opt.labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {loading ? (
        <div className="space-y-2" aria-busy="true" aria-live="polite">
          <p className="text-sm text-slate-600">{t("workers.loading")}</p>
          <div className="overflow-hidden rounded-md border border-brand-navy/15 bg-white shadow-card">
            <div className="space-y-0 divide-y divide-brand-navy/10">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex gap-4 p-4">
                  <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-brand-navy/10" />
                  <div className="flex flex-1 flex-col gap-2">
                    <div className="h-5 w-40 animate-pulse rounded bg-brand-navy/10" />
                    <div className="h-4 w-full max-w-sm animate-pulse rounded bg-brand-navy/10" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : loadFailed ? (
        <div
          role="alert"
          className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"
        >
          {t("workers.loadError")}
        </div>
      ) : workers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 p-8 text-center">
          <h2 className="text-lg font-semibold text-brand-navy">
            {t("workers.emptyTitle")}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
            {t("workers.emptyHint")}
          </p>
          <Link href="/workers/new" className="mt-6 inline-block">
            <Button type="button">{t("workers.new")}</Button>
          </Link>
        </div>
      ) : (
        <div className="rounded-md border border-brand-navy/15 bg-white shadow-card">
          <WorkerTable workers={workers} />
        </div>
      )}

      {/* Mobile FAB — fixed above bottom nav bar */}
      <Link
        href="/workers/new"
        aria-label={t("workers.new")}
        className="fixed bottom-[4.75rem] right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-brand-navy text-white shadow-lg transition-transform hover:scale-105 hover:bg-brand-gold hover:text-brand-navy active:scale-95 sm:hidden"
      >
        <Plus className="h-6 w-6" />
      </Link>
    </div>
  );
}
