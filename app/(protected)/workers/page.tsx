"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Worker } from "@prisma/client";
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
import type { EmploymentStatus } from "@prisma/client";

const EMPLOYMENT_STATUSES: EmploymentStatus[] = [
  "PENDING_START",
  "ACTIVE",
  "SUSPENDED",
  "TERMINATED",
];

export default function WorkersPage(): JSX.Element {
  const { t } = useTranslation();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const q = new URLSearchParams();
    if (search) q.set("search", search);
    if (status !== "all") q.set("status", status);
    void (async () => {
      setLoading(true);
      setLoadFailed(false);
      const res = await fetch(`/api/workers?${q.toString()}`, {
        credentials: "include",
      });
      if (cancelled) return;
      if (res.ok) {
        const json = (await res.json()) as { data: Worker[] };
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
  }, [search, status]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy">{t("workers.title")}</h1>
          <p className="text-slate-600">{t("workers.subtitle")}</p>
        </div>
        <Link href="/workers/new">
          <Button>{t("workers.new")}</Button>
        </Link>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-2">
          <Label htmlFor="workers-search" className="text-slate-600">
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
          />
        </div>
        <div className="w-full space-y-2 sm:w-52">
          <Label htmlFor="workers-status" className="text-slate-600">
            {t("workers.statusLabel")}
          </Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger id="workers-status" aria-label={t("workers.statusLabel")}>
              <SelectValue placeholder={t("workers.statusLabel")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("common.all")}</SelectItem>
              {EMPLOYMENT_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {t(`workerDetail.employment.${s}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {loading ? (
        <div className="space-y-2" aria-busy="true">
          <p className="text-sm text-slate-600">{t("workers.loading")}</p>
          <div className="overflow-hidden rounded-md border border-brand-navy/15 bg-white shadow-card">
            <div className="space-y-0 divide-y divide-brand-navy/10">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex gap-4 p-4">
                  <div className="h-5 flex-1 animate-pulse rounded bg-brand-navy/10" />
                  <div className="h-5 w-48 animate-pulse rounded bg-brand-navy/10" />
                  <div className="hidden h-5 w-24 animate-pulse rounded bg-brand-navy/10 sm:block" />
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
          <h2 className="text-lg font-semibold text-brand-navy">{t("workers.emptyTitle")}</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">{t("workers.emptyHint")}</p>
          <Link href="/workers/new" className="mt-6 inline-block">
            <Button type="button">{t("workers.new")}</Button>
          </Link>
        </div>
      ) : (
        <div className="rounded-md border border-brand-navy/15 bg-white shadow-card">
          <WorkerTable workers={workers} />
        </div>
      )}
    </div>
  );
}
