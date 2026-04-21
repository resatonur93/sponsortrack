"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import type { LeadStatus } from "@prisma/client";
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

export default function AdminLeadsPage(): JSX.Element {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [rows, setRows] = useState<LeadRow[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20 });
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") ?? "all");
  const [sourceFilter, setSourceFilter] = useState(searchParams.get("source") ?? "all");
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
      setError("Lead listesi alınamadı.");
      return;
    }
    const json = (await res.json()) as {
      data: LeadRow[];
      meta: { total: number; page: number; limit: number };
    };
    setRows(json.data);
    setMeta(json.meta);
    setError(null);
  }, [statusFilter, sourceFilter, search, page]);

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      router.replace("/login");
      return;
    }
    if (session?.user?.role !== "AUTHORISING_OFFICER") {
      router.replace("/dashboard");
      return;
    }
    void load();
  }, [status, session?.user?.role, router, load]);

  if (status === "loading" || !session) {
    return <p className="text-slate-400">Yükleniyor...</p>;
  }
  if (session.user.role !== "AUTHORISING_OFFICER") {
    return <p className="text-slate-400">Yönlendiriliyor...</p>;
  }
  if (error) {
    return <p className="text-rose-400">{error}</p>;
  }

  const totalPages = Math.max(1, Math.ceil(meta.total / meta.limit));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-50">Leads</h1>
        <p className="text-sm text-slate-400">Demo ve iletişim başvuruları</p>
      </div>

      <div className="flex flex-col gap-4 rounded-lg border border-slate-700 bg-[#1E293B] p-4 md:flex-row md:flex-wrap md:items-end">
        <div className="space-y-1">
          <Label className="text-slate-400">Durum</Label>
          <Select value={statusFilter} onValueChange={(v) => { setPage(1); setStatusFilter(v); }}>
            <SelectTrigger className="w-[200px] border-slate-600 bg-[#0F172A] text-slate-100">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tümü</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-slate-400">Kaynak</Label>
          <Select value={sourceFilter} onValueChange={(v) => { setPage(1); setSourceFilter(v); }}>
            <SelectTrigger className="w-[200px] border-slate-600 bg-[#0F172A] text-slate-100">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tümü</SelectItem>
              <SelectItem value="demo_request">demo_request</SelectItem>
              <SelectItem value="homepage">homepage</SelectItem>
              <SelectItem value="contact_form">contact_form</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-[200px] flex-1 space-y-1">
          <Label className="text-slate-400">Ara</Label>
          <Input
            className="border-slate-600 bg-[#0F172A] text-slate-100"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="E-posta, şirket, ad"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setPage(1);
                void load();
              }
            }}
          />
        </div>
        <Button
          type="button"
          className="bg-[#1E5BB5] hover:bg-[#1a4fa0]"
          onClick={() => {
            setPage(1);
            void load();
          }}
        >
          Uygula
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-700 bg-[#1E293B]">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-700 hover:bg-transparent">
              <TableHead className="text-slate-300">E-posta</TableHead>
              <TableHead className="text-slate-300">Şirket</TableHead>
              <TableHead className="text-slate-300">Ad</TableHead>
              <TableHead className="text-slate-300">Durum</TableHead>
              <TableHead className="text-slate-300">Kaynak</TableHead>
              <TableHead className="text-slate-300">Tarih</TableHead>
              <TableHead className="text-slate-300">İşlem</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-slate-500">
                  Kayıt yok
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.id} className="border-slate-700">
                  <TableCell className="text-slate-200">{r.email}</TableCell>
                  <TableCell className="text-slate-300">{r.companyName ?? "—"}</TableCell>
                  <TableCell className="text-slate-300">{r.name ?? "—"}</TableCell>
                  <TableCell>
                    <LeadStatusBadge status={r.status} />
                  </TableCell>
                  <TableCell className="text-xs text-slate-400">{r.source}</TableCell>
                  <TableCell className="text-xs text-slate-500">
                    {new Date(r.createdAt).toLocaleString("en-GB")}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/admin/leads/${r.id}`}
                      className="text-[#60A5FA] hover:underline"
                    >
                      Detay
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm text-slate-400">
        <span>
          Toplam {meta.total} · Sayfa {meta.page} / {totalPages}
        </span>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-slate-600 text-slate-200"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Önceki
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-slate-600 text-slate-200"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Sonraki
          </Button>
        </div>
      </div>
    </div>
  );
}
