"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Worker } from "@prisma/client";
import { WorkerTable } from "@/components/workers/WorkerTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "@/contexts/LanguageContext";

export default function WorkersPage(): JSX.Element {
  const { t } = useTranslation();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = new URLSearchParams();
    if (search) q.set("search", search);
    if (status !== "all") q.set("status", status);
    void (async () => {
      setLoading(true);
      const res = await fetch(`/api/workers?${q.toString()}`, {
        credentials: "include",
      });
      if (res.ok) {
        const json = (await res.json()) as { data: Worker[] };
        setWorkers(json.data);
      }
      setLoading(false);
    })();
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
        <div className="flex-1">
          <label className="text-sm text-slate-600">{t("workers.searchLabel")}</label>
          <Input
            placeholder={t("workers.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-48">
          <label className="text-sm text-slate-600">{t("workers.statusLabel")}</label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue placeholder={t("workers.statusLabel")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("common.all")}</SelectItem>
              <SelectItem value="PENDING_START">PENDING_START</SelectItem>
              <SelectItem value="ACTIVE">ACTIVE</SelectItem>
              <SelectItem value="SUSPENDED">SUSPENDED</SelectItem>
              <SelectItem value="TERMINATED">TERMINATED</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      {loading ? (
        <p>{t("workers.loading")}</p>
      ) : (
        <div className="rounded-md border border-slate-200 bg-white">
          <WorkerTable workers={workers} />
        </div>
      )}
    </div>
  );
}
