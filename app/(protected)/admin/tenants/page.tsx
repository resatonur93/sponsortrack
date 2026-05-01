"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type TenantRow = {
  id: string;
  companyName: string;
  licenceNumber: string;
  isActive: boolean;
  createdAt: string;
  _count: { users: number; workers: number };
};

export default function AdminTenantsPage(): JSX.Element {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [rows, setRows] = useState<TenantRow[]>([]);
  const [error, setError] = useState<string | null>(null);

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
    void (async () => {
      const res = await fetch("/api/admin/tenants", {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) {
        setError("Liste yüklenemedi.");
        return;
      }
      const json = (await res.json()) as { data: TenantRow[] };
      setRows(json.data);
    })();
  }, [status, session?.user?.canAccessAdminPanel, router]);

  if (status === "loading" || !session) {
    return <p className="text-slate-400">Yükleniyor...</p>;
  }
  if (!session.user.canAccessAdminPanel) {
    return <p className="text-slate-400">Yönlendiriliyor...</p>;
  }
  if (error) {
    return <p className="text-rose-400">{error}</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-50">Tenants</h1>
        <p className="text-sm text-slate-400">Kayıtlı şirketler</p>
      </div>
      <div className="overflow-x-auto rounded-lg border border-brand-navy/10 bg-white shadow-card">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-700">
              <TableHead className="text-slate-300">Şirket</TableHead>
              <TableHead className="text-slate-300">Lisans</TableHead>
              <TableHead className="text-slate-300">Kullanıcı</TableHead>
              <TableHead className="text-slate-300">Çalışan</TableHead>
              <TableHead className="text-slate-300">Durum</TableHead>
              <TableHead className="text-slate-300">Oluşturulma</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((t) => (
              <TableRow key={t.id} className="border-slate-700">
                <TableCell className="font-medium text-slate-100">
                  {t.companyName}
                </TableCell>
                <TableCell className="text-slate-300">{t.licenceNumber}</TableCell>
                <TableCell className="text-slate-300">{t._count.users}</TableCell>
                <TableCell className="text-slate-300">{t._count.workers}</TableCell>
                <TableCell className="text-slate-300">
                  {t.isActive ? "Aktif" : "Pasif"}
                </TableCell>
                <TableCell className="text-xs text-slate-500">
                  {new Date(t.createdAt).toLocaleString("en-GB")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
