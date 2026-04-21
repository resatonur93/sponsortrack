"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import type { LeadStatus } from "@prisma/client";
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

type AssignUser = { id: string; firstName: string; lastName: string; email: string };

type Activity = {
  id: string;
  type: string;
  message: string | null;
  createdAt: string;
  user: AssignUser | null;
};

type LeadDetail = {
  id: string;
  email: string;
  companyName: string | null;
  name: string | null;
  phone: string | null;
  message: string | null;
  source: string;
  status: LeadStatus;
  notes: string | null;
  assignedTo: string | null;
  assignee: AssignUser | null;
  createdAt: string;
  updatedAt: string;
  activities: Activity[];
};

const STATUSES: LeadStatus[] = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "DEMO_SCHEDULED",
  "CONVERTED",
  "LOST",
];

export default function AdminLeadDetailPage(): JSX.Element {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";

  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [users, setUsers] = useState<AssignUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [editStatus, setEditStatus] = useState<LeadStatus>("NEW");
  const [editNotes, setEditNotes] = useState("");
  const [editAssign, setEditAssign] = useState<string>("none");

  const [licenceNumber, setLicenceNumber] = useState("");
  const [convertPassword, setConvertPassword] = useState("");
  const [convertOpen, setConvertOpen] = useState(false);
  const [convertMsg, setConvertMsg] = useState<string | null>(null);

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
    if (!id) return;
    void (async () => {
      const [lr, ur] = await Promise.all([
        fetch(`/api/admin/leads/${id}`, { credentials: "include", cache: "no-store" }),
        fetch("/api/admin/users", { credentials: "include", cache: "no-store" }),
      ]);
      if (!lr.ok) {
        setError("Lead bulunamadı.");
        return;
      }
      const lj = (await lr.json()) as { data: LeadDetail };
      setLead(lj.data);
      setEditStatus(lj.data.status);
      setEditNotes(lj.data.notes ?? "");
      setEditAssign(lj.data.assignedTo ?? "none");

      if (ur.ok) {
        const uj = (await ur.json()) as {
          data: { id: string; firstName: string; lastName: string; email: string }[];
        };
        setUsers(
          uj.data.map((u) => ({
            id: u.id,
            firstName: u.firstName,
            lastName: u.lastName,
            email: u.email,
          }))
        );
      }
    })();
  }, [status, session?.user?.role, router, id]);

  async function save(): Promise<void> {
    if (!id) return;
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/admin/leads/${id}`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: editStatus,
        notes: editNotes || null,
        assignedTo: editAssign === "none" ? null : editAssign,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      setError("Kaydedilemedi.");
      return;
    }
    const lr = await fetch(`/api/admin/leads/${id}`, {
      credentials: "include",
      cache: "no-store",
    });
    if (lr.ok) {
      const lj = (await lr.json()) as { data: LeadDetail };
      setLead(lj.data);
      setEditStatus(lj.data.status);
      setEditNotes(lj.data.notes ?? "");
      setEditAssign(lj.data.assignedTo ?? "none");
    }
  }

  async function softDelete(): Promise<void> {
    if (!id || !confirm("Bu lead arşivlensin mi?")) return;
    const res = await fetch(`/api/admin/leads/${id}`, { method: "DELETE", credentials: "include" });
    if (res.ok) router.push("/admin/leads");
  }

  async function convert(): Promise<void> {
    if (!id) return;
    setConvertMsg(null);
    const res = await fetch(`/api/admin/leads/${id}/convert`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        licenceNumber: licenceNumber.trim(),
        password: convertPassword,
      }),
    });
    const j = (await res.json()) as { error?: string };
    if (!res.ok) {
      setConvertMsg(j.error ?? "Dönüşüm başarısız.");
      return;
    }
    setConvertMsg("Tenant oluşturuldu. Lead CONVERTED olarak işaretlendi.");
    setConvertOpen(false);
    const lr = await fetch(`/api/admin/leads/${id}`, { credentials: "include", cache: "no-store" });
    if (lr.ok) {
      const lj = (await lr.json()) as { data: LeadDetail };
      setLead(lj.data);
      setEditStatus(lj.data.status);
    }
  }

  if (status === "loading" || !session) {
    return <p className="text-slate-400">Yükleniyor...</p>;
  }
  if (session.user.role !== "AUTHORISING_OFFICER") {
    return <p className="text-slate-400">Yönlendiriliyor...</p>;
  }
  if (error && !lead) {
    return (
      <div className="space-y-4">
        <p className="text-rose-400">{error}</p>
        <Link href="/admin/leads" className="text-[#60A5FA] hover:underline">
          ← Lead listesi
        </Link>
      </div>
    );
  }
  if (!lead) {
    return <p className="text-slate-400">Yükleniyor...</p>;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href="/admin/leads" className="text-sm text-[#60A5FA] hover:underline">
            ← Leads
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-slate-50">{lead.email}</h1>
          <p className="text-sm text-slate-400">
            {lead.companyName ?? "—"} · {lead.source}
          </p>
        </div>
        <LeadStatusBadge status={lead.status} />
      </div>

      <div className="grid gap-6 rounded-lg border border-slate-700 bg-[#1E293B] p-6 md:grid-cols-2">
        <div className="space-y-2 text-sm">
          <p className="text-slate-400">Ad</p>
          <p className="text-slate-100">{lead.name ?? "—"}</p>
          <p className="text-slate-400">Telefon</p>
          <p className="text-slate-100">{lead.phone ?? "—"}</p>
          <p className="text-slate-400">Mesaj</p>
          <p className="whitespace-pre-wrap text-slate-200">{lead.message ?? "—"}</p>
        </div>
        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-slate-400">Durum</Label>
            <Select value={editStatus} onValueChange={(v) => setEditStatus(v as LeadStatus)}>
              <SelectTrigger className="border-slate-600 bg-[#0F172A] text-slate-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-slate-400">Atanan</Label>
            <Select value={editAssign} onValueChange={setEditAssign}>
              <SelectTrigger className="border-slate-600 bg-[#0F172A] text-slate-100">
                <SelectValue placeholder="Seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.firstName} {u.lastName} ({u.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-slate-400">Notlar</Label>
            <textarea
              className="min-h-[120px] w-full rounded-md border border-slate-600 bg-[#0F172A] px-3 py-2 text-sm text-slate-100"
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
            />
          </div>
          {error ? <p className="text-sm text-rose-400">{error}</p> : null}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              className="bg-[#1E5BB5] hover:bg-[#1a4fa0]"
              disabled={saving}
              onClick={() => void save()}
            >
              {saving ? "Kaydediliyor..." : "Kaydet"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="border-slate-600 text-slate-200"
              onClick={() => void softDelete()}
            >
              Arşivle
            </Button>
          </div>
        </div>
      </div>

      {lead.status !== "CONVERTED" ? (
        <div className="rounded-lg border border-slate-700 bg-[#1E293B] p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-slate-100">Tenant&apos;a dönüştür</h2>
            <Button
              type="button"
              variant="outline"
              className="border-amber-600 text-amber-200"
              onClick={() => setConvertOpen((v) => !v)}
            >
              {convertOpen ? "Kapat" : "Formu aç"}
            </Button>
          </div>
          {convertOpen ? (
            <div className="mt-4 space-y-3 border-t border-slate-700 pt-4">
              <p className="text-xs text-slate-400">
                Yeni tenant + AUTHORISING_OFFICER kullanıcı (lead e-postası) oluşturulur.
              </p>
              <div className="space-y-1">
                <Label className="text-slate-400">Sponsor lisans no</Label>
                <Input
                  className="border-slate-600 bg-[#0F172A] text-slate-100"
                  value={licenceNumber}
                  onChange={(e) => setLicenceNumber(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-slate-400">İlk giriş şifresi (min 8)</Label>
                <Input
                  type="password"
                  className="border-slate-600 bg-[#0F172A] text-slate-100"
                  value={convertPassword}
                  onChange={(e) => setConvertPassword(e.target.value)}
                />
              </div>
              <Button
                type="button"
                className="bg-emerald-700 hover:bg-emerald-800"
                onClick={() => void convert()}
              >
                Dönüştür
              </Button>
            </div>
          ) : null}
          {convertMsg ? <p className="mt-3 text-sm text-emerald-400">{convertMsg}</p> : null}
        </div>
      ) : null}

      <div className="rounded-lg border border-slate-700 bg-[#1E293B] p-6">
        <h2 className="text-lg font-semibold text-slate-100">Aktivite</h2>
        <ul className="mt-4 space-y-3">
          {lead.activities.length === 0 ? (
            <li className="text-sm text-slate-500">Kayıt yok</li>
          ) : (
            lead.activities.map((a) => (
              <li key={a.id} className="border-l-2 border-slate-600 pl-3 text-sm">
                <span className="font-medium text-slate-200">{a.type}</span>
                {a.message ? (
                  <span className="text-slate-400"> — {a.message}</span>
                ) : null}
                <div className="text-xs text-slate-500">
                  {new Date(a.createdAt).toLocaleString("en-GB")}
                  {a.user
                    ? ` · ${a.user.firstName} ${a.user.lastName}`
                    : ""}
                </div>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
