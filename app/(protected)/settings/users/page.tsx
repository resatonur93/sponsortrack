"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import type { Role } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TENANT_NAV_PAGE_KEYS,
  parsePageAccessOverrides,
  canAccessPage,
  type PageAccessOverrides,
} from "@/lib/authorization/page-access";
import { useTranslation } from "@/contexts/LanguageContext";

const ROLES: Role[] = ["AUTHORISING_OFFICER", "LEVEL_1_USER", "LEVEL_2_USER", "SYSTEM_ADMIN"];
const MANAGE_ROLES = new Set<string>(["AUTHORISING_OFFICER", "SYSTEM_ADMIN"]);

type Row = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  isActive: boolean;
  pageAccessOverrides: PageAccessOverrides;
  lastActiveAt: string | null;
};

export default function SettingsUsersPage(): JSX.Element {
  const { t, locale } = useTranslation();
  const localeTag = locale === "tr" ? "tr-TR" : "en-GB";
  const { data: session, status } = useSession();
  const router = useRouter();

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { role: Role; overrides: PageAccessOverrides }>>({});

  const canManage = MANAGE_ROLES.has(session?.user?.role ?? "");

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    const res = await fetch("/api/tenant-users?includeInactive=true", {
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) {
      setError(t("settingsUsers.loadFailed"));
      setLoading(false);
      return;
    }
    const json = (await res.json()) as { data: Row[] };
    setRows(json.data);
    setDrafts(
      Object.fromEntries(
        json.data.map((r) => [
          r.id,
          { role: r.role, overrides: parsePageAccessOverrides(r.pageAccessOverrides) },
        ])
      )
    );
    setError(null);
    setLoading(false);
  }, [t]);

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      router.replace("/login");
      return;
    }
    if (!canManage) {
      router.replace("/dashboard");
      return;
    }
    void load();
  }, [status, canManage, router, load]);

  async function saveRow(id: string): Promise<void> {
    const draft = drafts[id];
    if (!draft) return;
    setSavingId(id);
    try {
      const res = await fetch(`/api/tenant-users/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: draft.role, pageAccessOverrides: draft.overrides }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setError(j.error ?? t("settingsUsers.saveFailed"));
        return;
      }
      await load();
    } finally {
      setSavingId(null);
    }
  }

  if (status === "loading" || (status === "authenticated" && !canManage)) {
    return <p className="text-slate-600">{t("common.loading")}</p>;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-navy">{t("settingsUsers.title")}</h1>
        <p className="mt-1 text-sm text-slate-600">{t("settingsUsers.subtitle")}</p>
      </div>

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
      ) : null}

      {loading ? (
        <p className="text-sm text-slate-600">{t("common.loading")}</p>
      ) : (
        <div className="space-y-4">
          {rows.map((row) => {
            const draft = drafts[row.id] ?? {
              role: row.role,
              overrides: parsePageAccessOverrides(row.pageAccessOverrides),
            };
            const isSelf = row.id === session?.user?.id;
            return (
              <Card key={row.id} className="border-slate-200/90 shadow-sm">
                <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 border-b border-slate-100 bg-slate-50/50 pb-4">
                  <div>
                    <CardTitle className="text-base text-brand-navy">
                      {row.firstName} {row.lastName}
                    </CardTitle>
                    <p className="text-xs text-slate-600">{row.email}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {t("settingsUsers.lastActive")}:{" "}
                      {row.lastActiveAt
                        ? new Date(row.lastActiveAt).toLocaleString(localeTag, {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })
                        : t("settingsUsers.neverActive")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {!row.isActive ? (
                      <Badge variant="outline" className="border-slate-300 text-slate-600">
                        {t("settingsUsers.inactive")}
                      </Badge>
                    ) : null}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  <div className="max-w-xs space-y-1.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {t("settingsUsers.role")}
                    </p>
                    <Select
                      value={draft.role}
                      disabled={isSelf}
                      onValueChange={(v) =>
                        setDrafts((s) => ({ ...s, [row.id]: { ...draft, role: v as Role } }))
                      }
                    >
                      <SelectTrigger className="h-10 border-slate-300/95">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map((r) => (
                          <SelectItem key={r} value={r}>
                            {t(`admin.role.${r}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {t("settingsUsers.pageAccess")}
                    </p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {TENANT_NAV_PAGE_KEYS.map((key) => {
                        const allowed = canAccessPage(draft.overrides, key);
                        return (
                          <label
                            key={key}
                            className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
                          >
                            <input
                              type="checkbox"
                              className="size-3.5 rounded border-slate-300 text-brand-navy focus:ring-brand-navy"
                              checked={allowed}
                              disabled={isSelf}
                              onChange={(e) =>
                                setDrafts((s) => ({
                                  ...s,
                                  [row.id]: {
                                    ...draft,
                                    overrides: { ...draft.overrides, [key]: e.target.checked },
                                  },
                                }))
                              }
                            />
                            {t(`nav.${key}`)}
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {isSelf ? (
                    <p className="text-xs text-slate-500">{t("settingsUsers.cannotEditSelf")}</p>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      disabled={savingId === row.id}
                      onClick={() => void saveRow(row.id)}
                    >
                      {savingId === row.id ? t("settingsUsers.saving") : t("settingsUsers.save")}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
