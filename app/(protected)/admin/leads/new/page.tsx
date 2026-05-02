"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  AdminPageHeader,
} from "@/components/admin/shell/AdminPageShell";
import { ManualLeadForm } from "@/components/admin/leads/ManualLeadForm";
import { useTranslation } from "@/contexts/LanguageContext";

export default function AdminNewLeadPage(): JSX.Element {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { t } = useTranslation();

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") router.replace("/login");
    else if (!session?.user?.canAccessAdminPanel) router.replace("/dashboard");
  }, [status, session, router]);

  const loading = status === "loading" || !session;
  const canAccessAdmin = Boolean(session?.user.canAccessAdminPanel);

  return (
    <div className="mx-auto max-w-2xl space-y-8 pb-12">
      <Link
        href="/admin/leads"
        className="inline-flex items-center gap-2 text-sm font-semibold text-brand-navy hover:text-brand-gold"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {t("admin.leads.new.cancel")}
      </Link>
      <AdminPageHeader
        title={t("admin.leads.new.title")}
        subtitle={t("admin.leads.new.subtitle")}
      />
      {loading ? (
        <p className="text-brand-slate">{t("common.loading")}</p>
      ) : null}
      {!loading && canAccessAdmin ? (
        <ManualLeadForm canAccessAdmin={canAccessAdmin} />
      ) : null}
    </div>
  );
}
