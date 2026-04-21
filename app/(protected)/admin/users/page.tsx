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

type Row = {
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
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);

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
    void (async () => {
      const res = await fetch("/api/admin/users", {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) {
        setError("Liste yüklenemedi.");
        return;
      }
      const json = (await res.json()) as { data: Row[] };
      setRows(json.data);
    })();
  }, [status, session?.user?.role, router]);

  if (status === "loading" || !session) {
    return <p className="text-slate-400">Yükleniyor...</p>;
  }
  if (session.user.role !== "AUTHORISING_OFFICER") {
    return <p className="text-slate-400">Yönlendiriliyor...</p>;
  }
  if (error) {
    return <p className="text-rose-400">{error}</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-50">Kullanıcılar</h1>
        <p className="text-sm text-slate-400">Tüm kiracılardaki hesaplar</p>
      </div>
      <div className="overflow-x-auto rounded-lg border border-slate-700 bg-[#1E293B]">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-700 hover:bg-slate-800/50">
              <TableHead className="text-slate-300">Ad</TableHead>
              <TableHead className="text-slate-300">E-posta</TableHead>
              <TableHead className="text-slate-300">Rol</TableHead>
              <TableHead className="text-slate-300">Şirket</TableHead>
              <TableHead className="text-slate-300">Lisans</TableHead>
              <TableHead className="text-slate-300">Kayıt</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((u) => (
              <TableRow
                key={u.id}
                className="border-slate-700 text-slate-200 hover:bg-slate-800/50"
              >
                <TableCell className="font-medium">
                  {u.firstName} {u.lastName}
                </TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="border-slate-600 text-slate-200">
                    {u.role}
                  </Badge>
                </TableCell>
                <TableCell>{u.tenant.companyName}</TableCell>
                <TableCell className="text-xs text-slate-400">
                  {u.tenant.licenceNumber}
                </TableCell>
                <TableCell className="text-xs text-slate-500">
                  {new Date(u.createdAt).toLocaleString("en-GB")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
