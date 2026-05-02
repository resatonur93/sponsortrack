"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AdminPageHeader,
  AdminSurfaceCard,
} from "@/components/admin/shell/AdminPageShell";
import { useTranslation } from "@/contexts/LanguageContext";

export default function AdminNewLeadPage(): JSX.Element {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const [source, setSource] = useState("admin_manual");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status === "loading" || !session) {
    return <p className="text-brand-slate">{t("common.loading")}</p>;
  }
  if (!session.user.canAccessAdminPanel) {
    router.replace("/dashboard");
    return <p className="text-brand-slate">{t("common.loading")}</p>;
  }

  async function submit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/admin/leads", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          name: name.trim() || null,
          companyName: companyName.trim() || null,
          phone: phone.trim() || null,
          source: source.trim() || "admin_manual",
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { data?: { id: string }; error?: unknown };
      if (!res.ok) {
        setError(t("admin.leads.new.error"));
        return;
      }
      const id = json.data?.id;
      if (id) router.replace(`/admin/leads/${id}`);
      else router.replace("/admin/leads");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 pb-12">
      <Link
        href="/admin/leads"
        className="inline-flex items-center gap-2 text-sm font-semibold text-brand-navy hover:text-brand-gold"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {t("admin.leads.new.cancel")}
      </Link>
      <AdminPageHeader title={t("admin.leads.new.title")} subtitle={t("admin.leads.new.subtitle")} />
      <AdminSurfaceCard className="p-6">
        <form className="space-y-5" onSubmit={(e) => void submit(e)}>
          {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}
          <div className="space-y-2">
            <Label htmlFor="lead-email">{t("admin.leads.new.email")} *</Label>
            <Input
              id="lead-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border-brand-navy/15"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lead-name">{t("admin.leads.new.name")}</Label>
            <Input
              id="lead-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border-brand-navy/15"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lead-co">{t("admin.leads.new.company")}</Label>
            <Input
              id="lead-co"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="border-brand-navy/15"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lead-ph">{t("admin.leads.new.phone")}</Label>
            <Input id="lead-ph" value={phone} onChange={(e) => setPhone(e.target.value)} className="border-brand-navy/15" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lead-src">{t("admin.leads.filterSource")}</Label>
            <Input
              id="lead-src"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder={t("admin.leads.new.sourcePh")}
              className="border-brand-navy/15 font-mono text-sm"
            />
          </div>
          <div className="flex flex-wrap gap-3 pt-2">
            <Button type="submit" disabled={saving} className="bg-brand-navy font-bold hover:bg-brand-navy/92">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {saving ? t("admin.leads.new.saving") : t("admin.leads.new.submit")}
            </Button>
            <Button type="button" variant="outline" className="border-brand-navy/25" asChild>
              <Link href="/admin/leads">{t("admin.leads.new.cancel")}</Link>
            </Button>
          </div>
        </form>
      </AdminSurfaceCard>
    </div>
  );
}
