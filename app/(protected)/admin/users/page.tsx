"use client";

import { Suspense, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import type { Role } from "@prisma/client";
import { UserPlus, Users } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AdminRoleBadge } from "@/components/admin/AdminRoleBadge";
import {
  AdminEmptyState,
  AdminFilterBar,
  AdminPageHeader,
  AdminTablePanel,
  initialsFromName,
} from "@/components/admin/shell/AdminPageShell";
import { useTranslation } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

const ROLES: Role[] = ["AUTHORISING_OFFICER", "LEVEL_1_USER", "LEVEL_2_USER", "SYSTEM_ADMIN"];

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

function UsersInner(): JSX.Element {
  const { t, locale } = useTranslation();
  const localeTag = locale === "tr" ? "tr-TR" : "en-GB";
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tenantId = searchParams.get("tenantId") ?? "all";
  const initialRole = searchParams.get("role") ?? "all";

  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState(initialRole);

  useEffect(() => {
    setRoleFilter(searchParams.get("role") ?? "all");
  }, [searchParams]);

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
      const q = new URLSearchParams();
      if (tenantId !== "all") q.set("tenantId", tenantId);
      if (roleFilter !== "all") q.set("role", roleFilter);
      const res = await fetch(`/api/admin/users?${q}`, {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) {
        setError(t("admin.users.errorLoad"));
        return;
      }
      const json = (await res.json()) as { data: Row[] };
      setRows(json.data);
      setError(null);
    })();
  }, [status, session?.user?.canAccessAdminPanel, router, t, tenantId, roleFilter]);

  if (status === "loading" || !session) {
    return <p className="text-brand-slate">{t("common.loading")}</p>;
  }
  if (!session.user.canAccessAdminPanel) {
    return <p className="text-brand-slate">{t("common.loading")}</p>;
  }

  const headerActions = (
    <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
      <Button variant="outline" className="h-11 border-brand-navy/25 font-semibold" asChild>
        <Link href="/admin/tenants">
          <UserPlus className="mr-2 h-4 w-4" aria-hidden />
          {t("admin.users.newUser")}
        </Link>
      </Button>
      <Button className="h-11 bg-brand-navy font-bold shadow hover:bg-brand-navy/92" asChild>
        <Link href="/admin">{t("admin.nav.dashboard")}</Link>
      </Button>
    </div>
  );

  const tenantBadge =
    tenantId !== "all" ? (
      <Badge variant="outline" className="border-brand-navy/25 bg-brand-navy/[0.05] px-3 py-1 text-brand-navy">
        {t("admin.users.filteredByTenant")}
      </Badge>
    ) : null;

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-8">
      <AdminPageHeader title={t("admin.users.title")} subtitle={t("admin.users.subtitle")} actions={headerActions} />

      {tenantBadge ? (
        <div className="flex flex-wrap items-center gap-2">
          {tenantBadge}
          <Button variant="ghost" size="sm" className="font-semibold text-brand-navy" asChild>
            <Link href="/admin/users">{t("admin.users.showAllTenants")}</Link>
          </Button>
        </div>
      ) : null}

      <AdminFilterBar>
        <div className="w-full md:w-[280px] md:max-w-md">
          <Label className="text-xs font-bold uppercase tracking-wide text-brand-slate">{t("admin.users.filterRole")}</Label>
          <Select
            value={roleFilter}
            onValueChange={(v) => {
              setRoleFilter(v);
              const p = new URLSearchParams(searchParams.toString());
              if (v === "all") p.delete("role");
              else p.set("role", v);
              if (tenantId !== "all") p.set("tenantId", tenantId);
              router.replace(`/admin/users?${p}`, { scroll: false });
            }}
          >
            <SelectTrigger className="mt-2 h-11 border-brand-navy/15 bg-white font-medium shadow-inner">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("admin.common.allRoles")}</SelectItem>
              {ROLES.map((r) => (
                <SelectItem key={r} value={r}>
                  {t(`admin.role.${r}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-1 flex-col justify-center text-sm leading-snug text-brand-slate md:min-w-[220px]">
          <span>{t("admin.users.newUserHint")}</span>
        </div>
      </AdminFilterBar>

      {error ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">{error}</p>
      ) : null}

      {rows.length === 0 ? (
        <AdminEmptyState
          icon={<Users aria-hidden />}
          title={t("admin.users.emptyTitle")}
          description={t("admin.users.emptyHint")}
          secondaryAction={
            <Button variant="outline" className="border-brand-navy/25" asChild>
              <Link href="/admin/tenants">{t("admin.tenants.title")}</Link>
            </Button>
          }
        />
      ) : (
        <AdminTablePanel title={t("admin.users.tableTitle")}>
          <Table>
            <TableHeader>
              <TableRow className="border-brand-navy/10 bg-slate-50/95 hover:bg-slate-50/95">
                <TableHead className="font-bold text-brand-navy">{t("admin.users.colName")}</TableHead>
                <TableHead className="font-bold text-brand-navy">{t("admin.users.colEmail")}</TableHead>
                <TableHead className="font-bold text-brand-navy">{t("admin.users.colRole")}</TableHead>
                <TableHead className="font-bold text-brand-navy">{t("admin.users.colCompany")}</TableHead>
                <TableHead className="font-bold text-brand-navy">{t("admin.users.colLicence")}</TableHead>
                <TableHead className="font-bold text-brand-navy">{t("admin.users.colRegistered")}</TableHead>
                <TableHead className="text-center font-bold text-brand-navy">{t("admin.tenants.colStatus")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((u) => (
                <TableRow key={u.id} className="border-brand-navy/[0.07] hover:bg-brand-navy/[0.035]">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-navy/10 text-xs font-bold text-brand-navy ring-1 ring-brand-navy/10"
                        aria-hidden
                      >
                        {initialsFromName(u.firstName, u.lastName, u.email)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-brand-navy">
                          {u.firstName} {u.lastName}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-slate-700">{u.email}</TableCell>
                  <TableCell>
                    <AdminRoleBadge role={u.role} label={t(`admin.role.${u.role}`)} />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium text-brand-navy">{u.tenant.companyName}</span>
                      <Link
                        href={`/admin/users?tenantId=${encodeURIComponent(u.tenant.id)}`}
                        className="text-[11px] font-semibold text-sky-800 underline underline-offset-2 hover:text-brand-navy"
                      >
                        {t("admin.users.focusTenantUsers")}
                      </Link>
                    </div>
                  </TableCell>
                  <TableCell>
                    <code className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[11px] text-slate-800">
                      {u.tenant.licenceNumber}
                    </code>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-brand-slate">
                    {new Date(u.createdAt).toLocaleString(localeTag, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant={u.isActive && u.tenant.isActive ? "success" : "outline"}
                      className={cn(!u.isActive && "border-slate-300 text-brand-slate")}
                    >
                      {u.isActive && u.tenant.isActive
                        ? t("admin.common.statusActive")
                        : t("admin.common.statusInactive")}
                    </Badge>
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

export default function AdminUsersPage(): JSX.Element {
  const { t } = useTranslation();
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[30vh] items-center justify-center text-brand-slate" role="status">
          {t("common.loading")}
        </div>
      }
    >
      <UsersInner />
    </Suspense>
  );
}
