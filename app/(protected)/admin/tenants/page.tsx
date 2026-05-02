"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Building2, ChevronRight, Plus } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AdminEmptyState,
  AdminPageHeader,
  AdminTablePanel,
  initialsFromName,
} from "@/components/admin/shell/AdminPageShell";
import { useTranslation } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

type TenantRow = {
  id: string;
  companyName: string;
  licenceNumber: string;
  isActive: boolean;
  createdAt: string;
  _count: { users: number; workers: number };
};

export default function AdminTenantsPage(): JSX.Element {
  const { t, locale } = useTranslation();
  const localeTag = locale === "tr" ? "tr-TR" : "en-GB";
  const { data: session, status } = useSession();
  const router = useRouter();
  const [rows, setRows] = useState<TenantRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const registerHref = useMemo(() => "/register", []);

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
        setError(t("admin.tenants.errorLoad"));
        return;
      }
      const json = (await res.json()) as { data: TenantRow[] };
      setRows(json.data);
      setError(null);
    })();
  }, [status, session?.user?.canAccessAdminPanel, router, t]);

  if (status === "loading" || !session) {
    return <p className="text-brand-slate">{t("common.loading")}</p>;
  }
  if (!session.user.canAccessAdminPanel) {
    return <p className="text-brand-slate">{t("common.loading")}</p>;
  }
  if (error && rows.length === 0) {
    return (
      <div className="space-y-3 rounded-xl border border-red-200 bg-red-50/90 p-6">
        <p className="font-medium text-red-900">{error}</p>
        <Button variant="outline" className="border-brand-navy/25" asChild>
          <Link href="/admin">{t("admin.nav.dashboard")}</Link>
        </Button>
      </div>
    );
  }

  const companyInitials = (name: string) => {
    const parts = name.trim().split(/\s+/).slice(0, 2);
    return initialsFromName(parts[0] ?? null, parts[1] ?? null, name);
  };

  const headerActions = (
    <Button asChild className="bg-brand-navy px-6 font-bold shadow-md hover:bg-brand-navy/92">
      <Link href={registerHref}>
        <Plus className="mr-2 h-4 w-4" aria-hidden />
        {t("admin.tenants.newOrg")}
      </Link>
    </Button>
  );

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-8">
      <AdminPageHeader title={t("admin.tenants.title")} subtitle={t("admin.tenants.subtitle")} actions={headerActions} />

      {rows.length === 0 ? (
        <AdminEmptyState
          icon={<Building2 aria-hidden />}
          title={t("admin.tenants.emptyTitle")}
          description={t("admin.tenants.emptyHint")}
          primaryAction={
            <Button asChild className="bg-brand-navy px-8 font-bold shadow-lg hover:bg-brand-navy/92">
              <Link href={registerHref}>
                <Plus className="mr-2 h-4 w-4" aria-hidden />
                {t("admin.tenants.newOrg")}
              </Link>
            </Button>
          }
        />
      ) : (
        <AdminTablePanel title={t("admin.tenants.tableTitle")}>
          <Table>
            <TableHeader>
              <TableRow className="border-brand-navy/10 bg-slate-50/95 hover:bg-slate-50/95">
                <TableHead className="font-bold text-brand-navy">{t("admin.tenants.colCompany")}</TableHead>
                <TableHead className="font-bold text-brand-navy">{t("admin.tenants.colLicence")}</TableHead>
                <TableHead className="text-center font-bold text-brand-navy">{t("admin.tenants.colUsers")}</TableHead>
                <TableHead className="text-center font-bold text-brand-navy">{t("admin.tenants.colWorkers")}</TableHead>
                <TableHead className="font-bold text-brand-navy">{t("admin.tenants.colStatus")}</TableHead>
                <TableHead className="font-bold text-brand-navy">{t("admin.tenants.colCreated")}</TableHead>
                <TableHead className="text-right font-bold text-brand-navy">{t("common.action")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow
                  key={row.id}
                  className={cn(
                    "group border-brand-navy/[0.07] transition-colors hover:bg-brand-navy/[0.04]",
                    row.isActive ? "" : "opacity-85"
                  )}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-navy/10 text-xs font-bold text-brand-navy ring-1 ring-brand-navy/12"
                        aria-hidden
                      >
                        {companyInitials(row.companyName)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-brand-navy">{row.companyName}</p>
                        <p className="text-[11px] text-brand-slate">ID · {row.id.slice(0, 8)}…</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <code className="rounded-md border border-brand-navy/10 bg-brand-navy/[0.04] px-2 py-1 text-xs font-semibold text-brand-navy">
                      {row.licenceNumber}
                    </code>
                  </TableCell>
                  <TableCell className="text-center font-semibold tabular-nums text-slate-800">{row._count.users}</TableCell>
                  <TableCell className="text-center font-semibold tabular-nums text-slate-800">{row._count.workers}</TableCell>
                  <TableCell>
                    <Badge variant={row.isActive ? "success" : "outline"} className="font-semibold">
                      {row.isActive ? t("admin.common.statusActive") : t("admin.common.statusInactive")}
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-brand-slate">
                    {new Date(row.createdAt).toLocaleString(localeTag, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 border-brand-navy/25 font-semibold text-brand-navy hover:bg-brand-navy/[0.06]"
                      asChild
                    >
                      <Link href={`/admin/users?tenantId=${encodeURIComponent(row.id)}`}>
                        {t("admin.tenants.actionUsers")}
                        <ChevronRight className="h-4 w-4 opacity-70" aria-hidden />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </AdminTablePanel>
      )}
    </div>
  );
}
