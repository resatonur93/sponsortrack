"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import type { Role } from "@prisma/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

type AdminUserRow = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
  tenant: {
    id: string;
    companyName: string;
    licenceNumber: string;
    isActive: boolean;
  };
};

export default function AdminUsersPage(): JSX.Element {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      router.replace("/login");
      return;
    }
    if (session?.user?.role !== "SYSTEM_ADMIN") {
      router.replace("/dashboard");
      return;
    }
    void (async () => {
      const res = await fetch("/api/admin/users", {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) {
        setError(res.status === 403 ? "Bu sayfaya erişim yetkiniz yok." : "Veri alınamadı.");
        setLoading(false);
        return;
      }
      const json = (await res.json()) as { data: AdminUserRow[] };
      setRows(json.data);
      setLoading(false);
    })();
  }, [status, session?.user?.role, router]);

  if (status === "loading" || loading) {
    return <p className="text-slate-600">Yükleniyor...</p>;
  }
  if (session?.user?.role !== "SYSTEM_ADMIN") {
    return <p className="text-slate-600">Yönlendiriliyor...</p>;
  }
  if (error) {
    return <p className="text-red-600">{error}</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-navy">Yönetici — Üyeler</h1>
        <p className="text-slate-600">
          Sistemde kayıtlı tüm kullanıcı hesapları (SYSTEM_ADMIN rolü).
        </p>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ad</TableHead>
              <TableHead>E-posta</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Şirket</TableHead>
              <TableHead>Lisans</TableHead>
              <TableHead>Durum</TableHead>
              <TableHead>Kayıt</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-slate-500">
                  Henüz kullanıcı yok.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">
                    {u.firstName} {u.lastName}
                  </TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    <Badge variant={u.role === "SYSTEM_ADMIN" ? "default" : "outline"}>
                      {u.role}
                    </Badge>
                  </TableCell>
                  <TableCell>{u.tenant.companyName}</TableCell>
                  <TableCell className="text-xs text-slate-600">
                    {u.tenant.licenceNumber}
                  </TableCell>
                  <TableCell>
                    {u.isActive && u.tenant.isActive ? (
                      <span className="text-emerald-700">Aktif</span>
                    ) : (
                      <span className="text-amber-700">Pasif / kiracı</span>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-slate-600">
                    {new Date(u.createdAt).toLocaleString("en-GB")}
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
