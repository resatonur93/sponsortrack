"use client";

import { useCallback, useEffect, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import {
  Globe,
  Laptop,
  Loader2,
  Shield,
  ShieldOff,
  Timer,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AdminSurfaceCard } from "@/components/admin/shell/AdminPageShell";
import { useTranslation } from "@/contexts/LanguageContext";
import type { AllowedIpRule, TenantSecuritySettings } from "@prisma/client";

type SessionRowDto = {
  id: string;
  userEmail: string;
  userName: string;
  deviceLabel: string;
  userAgentSnippet: string | null;
  ip: string;
  lastSeenAt: string;
  isCurrent: boolean;
};

type TrustedRowDto = {
  id: string;
  userEmail: string;
  userName: string;
  fingerprintPreview: string;
  label: string;
  trusted: boolean;
  lastIp: string;
  lastSeenAt: string;
  trustedAt: string | null;
};

export function SecuritySettingsPanel(): JSX.Element {
  const { t } = useTranslation();
  const { data: sess } = useSession();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tenant, setTenant] = useState<TenantSecuritySettings | null>(null);
  const [sessions, setSessions] = useState<SessionRowDto[]>([]);
  const [allowedIps, setAllowedIps] = useState<AllowedIpRule[]>([]);
  const [trusted, setTrusted] = useState<TrustedRowDto[]>([]);

  const [idleMin, setIdleMin] = useState("");
  const [absMin, setAbsMin] = useState("");
  const [savingTenant, setSavingTenant] = useState(false);

  const [ipLabel, setIpLabel] = useState("");
  const [ipCidr, setIpCidr] = useState("");
  const [busyIpAdd, setBusyIpAdd] = useState(false);
  const [revokeBusy, setRevokeBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/settings/security", {
        credentials: "include",
        cache: "no-store",
      });
      const json = (await res.json().catch(() => ({}))) as {
        tenant?: TenantSecuritySettings;
        sessions?: SessionRowDto[];
        allowedIps?: AllowedIpRule[];
        trustedDevices?: TrustedRowDto[];
        error?: string;
      };
      if (!res.ok) {
        setError(json.error ?? t("admin.settings.security.loadError"));
        return;
      }
      if (json.tenant) setTenant(json.tenant);
      if (json.sessions) setSessions(json.sessions);
      if (json.allowedIps) setAllowedIps(json.allowedIps);
      if (json.trustedDevices) setTrusted(json.trustedDevices);
      setIdleMin(
        json.tenant?.sessionIdleTimeoutMinutes != null
          ? String(json.tenant.sessionIdleTimeoutMinutes)
          : ""
      );
      setAbsMin(
        json.tenant?.sessionAbsoluteMaxMinutes != null
          ? String(json.tenant.sessionAbsoluteMaxMinutes)
          : ""
      );
    } catch {
      setError(t("admin.settings.security.loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function patchTenant(patch: Partial<TenantSecuritySettings>): Promise<void> {
    setSavingTenant(true);
    try {
      const res = await fetch("/api/settings/security/tenant", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) return;
      const next = await res.json();
      setTenant(next);
    } finally {
      setSavingTenant(false);
    }
  }

  async function saveSessionTimeouts(): Promise<void> {
    const idle =
      idleMin.trim() === "" ? null : Math.max(5, parseInt(idleMin, 10));
    const abs =
      absMin.trim() === "" ? null : Math.max(15, parseInt(absMin, 10));
    if (idleMin.trim() !== "" && Number.isNaN(idle!)) return;
    if (absMin.trim() !== "" && Number.isNaN(abs!)) return;
    await patchTenant({
      sessionIdleTimeoutMinutes: idle ?? null,
      sessionAbsoluteMaxMinutes: abs ?? null,
    });
    await load();
  }

  async function toggleWhitelist(enabled: boolean): Promise<void> {
    await patchTenant({ enforceIpWhitelist: enabled });
    await load();
  }

  async function addIp(): Promise<void> {
    if (!ipLabel.trim() || !ipCidr.trim()) return;
    setBusyIpAdd(true);
    try {
      const res = await fetch("/api/settings/security/allowed-ips", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: ipLabel.trim(), cidr: ipCidr.trim() }),
      });
      if (res.ok) {
        setIpLabel("");
        setIpCidr("");
        await load();
      }
    } finally {
      setBusyIpAdd(false);
    }
  }

  async function deleteIp(ruleId: string): Promise<void> {
    await fetch(`/api/settings/security/allowed-ips/${ruleId}`, {
      method: "DELETE",
      credentials: "include",
    });
    await load();
  }

  async function toggleIpActive(ruleId: string, isActive: boolean): Promise<void> {
    await fetch(`/api/settings/security/allowed-ips/${ruleId}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive }),
    });
    await load();
  }

  async function revoke(
    scope: "self_other" | "self_all" | "tenant_all"
  ): Promise<void> {
    if (scope === "tenant_all" || scope === "self_all") {
      const ok = window.confirm(
        scope === "tenant_all"
          ? t("admin.settings.security.revokeTenantConfirm")
          : t("admin.settings.security.revokeSelfAllConfirm")
      );
      if (!ok) return;
    }
    setRevokeBusy(scope);
    try {
      const res = await fetch("/api/settings/security/sessions/revoke", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope }),
      });
      await load();
      if (res.ok && (scope === "tenant_all" || scope === "self_all")) {
        await signOut({ callbackUrl: "/login" });
      }
    } finally {
      setRevokeBusy(null);
    }
  }

  async function patchTrusted(deviceId: string, body: object): Promise<void> {
    await fetch(`/api/settings/security/trusted-devices/${deviceId}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await load();
  }

  if (loading) {
    return (
      <AdminSurfaceCard className="flex items-center gap-3 p-8 text-brand-slate">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
        {t("common.loading")}
      </AdminSurfaceCard>
    );
  }

  if (error || !tenant) {
    return (
      <AdminSurfaceCard className="space-y-4 p-8">
        <p className="text-sm font-medium text-red-700">{error}</p>
        <Button type="button" variant="outline" onClick={() => void load()}>
          {t("common.retry")}
        </Button>
      </AdminSurfaceCard>
    );
  }

  const userEmail = sess?.user?.email ?? "";

  return (
    <div className="space-y-8">
      <AdminSurfaceCard className="space-y-6 p-6 md:p-8">
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-navy/10 text-brand-navy ring-1 ring-brand-navy/15">
            <Timer className="h-7 w-7" aria-hidden strokeWidth={1.75} />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <h3 className="text-lg font-bold text-brand-navy">
              {t("admin.settings.security.sessions.title")}
            </h3>
            <p className="text-sm text-brand-slate">
              {t("admin.settings.security.sessions.subtitle")}
            </p>
          </div>
          <Badge variant="outline" className="bg-brand-navy/5 font-mono text-xs">
            {userEmail || "—"}
          </Badge>
        </div>

        <div className="grid gap-4 lg:grid-cols-2 lg:gap-10">
          <div className="space-y-3">
            <Label className="text-brand-navy">{t("admin.settings.security.idleLabel")}</Label>
            <Input
              type="number"
              min={5}
              placeholder={t("admin.settings.security.idlePlaceholder")}
              value={idleMin}
              onChange={(e) => setIdleMin(e.target.value)}
              className="border-brand-navy/15 max-w-xs"
            />
            <Label className="text-brand-navy">{t("admin.settings.security.absLabel")}</Label>
            <Input
              type="number"
              min={15}
              placeholder={t("admin.settings.security.absPlaceholder")}
              value={absMin}
              onChange={(e) => setAbsMin(e.target.value)}
              className="border-brand-navy/15 max-w-xs"
            />
            <p className="text-xs leading-relaxed text-brand-slate">
              {t("admin.settings.security.timeoutsHint")}
            </p>
            <Button
              type="button"
              disabled={savingTenant}
              onClick={() => void saveSessionTimeouts()}
              variant="secondary"
              className="border-brand-navy/20 font-semibold"
            >
              {savingTenant ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : null}
              {t("admin.settings.security.savePolicies")}
            </Button>
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-brand-slate">
              {t("admin.settings.security.sessions.quickActions")}
            </p>
            <Button
              type="button"
              variant="outline"
              disabled={Boolean(revokeBusy)}
              onClick={() => void revoke("self_other")}
              className="justify-start font-semibold border-brand-navy/20"
            >
              {t("admin.settings.security.sessions.logoutOthers")}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={Boolean(revokeBusy)}
              onClick={() => void revoke("self_all")}
              className="justify-start font-semibold border-amber-200 text-amber-950"
            >
              {t("admin.settings.security.sessions.logoutMineAll")}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={Boolean(revokeBusy)}
              onClick={() => void revoke("tenant_all")}
              className="justify-start font-semibold border-red-200 text-red-900"
            >
              {t("admin.settings.security.sessions.logoutTenantAll")}
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-brand-navy/10">
          <Table>
            <TableHeader className="bg-brand-navy/[0.04]">
              <TableRow>
                <TableHead className="font-bold text-brand-navy">
                  {t("admin.settings.security.table.user")}
                </TableHead>
                <TableHead className="font-bold text-brand-navy">
                  {t("admin.settings.security.table.device")}
                </TableHead>
                <TableHead className="font-bold text-brand-navy">IP</TableHead>
                <TableHead className="font-bold text-brand-navy">
                  {t("admin.settings.security.table.last")}
                </TableHead>
                <TableHead className="text-right font-bold text-brand-navy">
                  —
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-sm text-brand-slate">
                    {t("admin.settings.security.sessions.empty")}
                  </TableCell>
                </TableRow>
              ) : (
                sessions.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="align-top">
                      <div className="font-semibold text-brand-navy">{s.userName}</div>
                      <div className="text-xs text-brand-slate">{s.userEmail}</div>
                    </TableCell>
                    <TableCell className="max-w-[220px] align-top">
                      <div className="font-medium">{s.deviceLabel}</div>
                      <div className="overflow-hidden text-[11px] text-brand-slate line-clamp-2">
                        {s.userAgentSnippet ?? "—"}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{s.ip}</TableCell>
                    <TableCell className="text-sm text-brand-slate">
                      {new Date(s.lastSeenAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {s.isCurrent ? (
                        <Badge className="bg-emerald-600 hover:bg-emerald-600">{t("admin.settings.security.sessions.thisDevice")}</Badge>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </AdminSurfaceCard>

      <AdminSurfaceCard className="space-y-6 p-6 md:p-8">
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-900 ring-1 ring-emerald-500/20">
            <Globe className="h-7 w-7" aria-hidden strokeWidth={1.75} />
          </div>
          <div className="flex-1 space-y-4">
            <div>
              <h3 className="text-lg font-bold text-brand-navy">
                {t("admin.settings.security.ip.title")}
              </h3>
              <p className="text-sm text-brand-slate">{t("admin.settings.security.ip.subtitle")}</p>
            </div>
            <label className="flex cursor-pointer items-center gap-3 text-sm font-medium text-brand-navy">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-brand-navy/30"
                checked={tenant.enforceIpWhitelist}
                onChange={(e) => void toggleWhitelist(e.target.checked)}
              />
              {tenant.enforceIpWhitelist ? (
                <Shield className="h-4 w-4 text-emerald-700" aria-hidden />
              ) : (
                <ShieldOff className="h-4 w-4 text-brand-slate" aria-hidden />
              )}
              {t("admin.settings.security.ip.whitelistOnly")}
            </label>
          </div>
        </div>

        <div className="grid gap-3 border-t border-brand-navy/10 pt-6 md:grid-cols-3 md:gap-4">
          <div className="space-y-2 md:col-span-1">
            <Label>{t("admin.settings.security.ip.colLabel")}</Label>
            <Input
              value={ipLabel}
              onChange={(e) => setIpLabel(e.target.value)}
              placeholder="Office HQ"
              className="border-brand-navy/15"
            />
          </div>
          <div className="space-y-2 md:col-span-1">
            <Label>{t("admin.settings.security.ip.colCidr")}</Label>
            <Input
              value={ipCidr}
              onChange={(e) => setIpCidr(e.target.value)}
              placeholder="203.0.113.0/24"
              className="border-brand-navy/15 font-mono text-sm"
            />
          </div>
          <div className="flex items-end">
            <Button
              type="button"
              onClick={() => void addIp()}
              disabled={busyIpAdd}
              className="w-full bg-brand-navy font-bold md:w-auto"
            >
              {busyIpAdd ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {t("admin.settings.security.ip.add")}
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-brand-navy/10">
          <Table>
            <TableHeader className="bg-brand-navy/[0.04]">
              <TableRow>
                <TableHead className="font-bold text-brand-navy">{t("admin.settings.security.table.label")}</TableHead>
                <TableHead className="font-bold text-brand-navy">CIDR / IP</TableHead>
                <TableHead className="font-bold text-brand-navy">{t("common.status")}</TableHead>
                <TableHead className="text-right font-bold text-brand-navy">{t("common.action")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allowedIps.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-sm text-brand-slate">
                    {t("admin.settings.security.ip.empty")}
                  </TableCell>
                </TableRow>
              ) : (
                allowedIps.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.label}</TableCell>
                    <TableCell className="font-mono text-sm">{r.cidr}</TableCell>
                    <TableCell>
                      <button
                        type="button"
                        className={`text-xs font-bold uppercase underline-offset-2 hover:underline ${
                          r.isActive ? "text-emerald-800" : "text-brand-slate"
                        }`}
                        onClick={() => void toggleIpActive(r.id, !r.isActive)}
                      >
                        {r.isActive ? t("admin.settings.security.active") : t("admin.settings.security.inactive")}
                      </button>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={t("admin.settings.security.ip.delete")}
                        onClick={() => void deleteIp(r.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" aria-hidden />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </AdminSurfaceCard>

      <AdminSurfaceCard className="space-y-6 p-6 md:p-8">
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-950 ring-1 ring-amber-500/25">
            <Laptop className="h-7 w-7" aria-hidden strokeWidth={1.75} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-brand-navy">
              {t("admin.settings.security.devices.title")}
            </h3>
            <p className="text-sm text-brand-slate">{t("admin.settings.security.devices.subtitle")}</p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-brand-navy/10">
          <Table>
            <TableHeader className="bg-brand-navy/[0.04]">
              <TableRow>
                <TableHead className="font-bold text-brand-navy">{t("admin.settings.security.table.user")}</TableHead>
                <TableHead className="font-bold text-brand-navy">{t("admin.settings.security.devices.deviceName")}</TableHead>
                <TableHead className="font-bold text-brand-navy">IP</TableHead>
                <TableHead className="font-bold text-brand-navy">{t("admin.settings.security.table.lastLogin")}</TableHead>
                <TableHead className="text-right font-bold text-brand-navy">{t("common.action")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trusted.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-sm text-brand-slate">
                    {t("admin.settings.security.devices.empty")}
                  </TableCell>
                </TableRow>
              ) : (
                trusted.map((d) => (
                  <TrustedDeviceRow key={d.id} d={d} onSaved={() => void load()} patch={patchTrusted} />
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </AdminSurfaceCard>
    </div>
  );
}

function TrustedDeviceRow(props: {
  d: TrustedRowDto;
  patch: (id: string, body: object) => Promise<void>;
  onSaved: () => void;
}) {
  const { d, patch, onSaved } = props;
  const { t } = useTranslation();
  const [label, setLabel] = useState(d.label);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setLabel(d.label);
  }, [d.label]);

  async function saveLabel(): Promise<void> {
    if (!label.trim()) {
      setLabel(d.label);
      return;
    }
    if (label.trim() === d.label) return;
    setBusy(true);
    try {
      await patch(d.id, { trusted: d.trusted, label: label.trim() });
      onSaved();
    } finally {
      setBusy(false);
    }
  }

  async function toggleTrust(next: boolean): Promise<void> {
    setBusy(true);
    try {
      await patch(d.id, { trusted: next });
      onSaved();
    } finally {
      setBusy(false);
    }
  }

  return (
    <TableRow>
      <TableCell className="align-top">
        <div className="font-semibold text-brand-navy">{d.userName}</div>
        <div className="text-xs text-brand-slate">{d.userEmail}</div>
        <div className="mt-1 font-mono text-[10px] text-brand-slate">{d.fingerprintPreview}</div>
      </TableCell>
      <TableCell className="max-w-[200px]">
        <Input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onBlur={() => void saveLabel()}
          className="border-brand-navy/15 text-sm"
          disabled={busy}
        />
      </TableCell>
      <TableCell className="font-mono text-xs">{d.lastIp}</TableCell>
      <TableCell className="text-sm text-brand-slate">
        <div>{new Date(d.lastSeenAt).toLocaleString()}</div>
        {d.trustedAt ? (
          <div className="text-[11px] text-emerald-800">
            {t("admin.settings.security.devices.trustedSince")}: {new Date(d.trustedAt).toLocaleDateString()}
          </div>
        ) : null}
      </TableCell>
      <TableCell className="text-right align-top">
        {d.trusted ? (
          <Button type="button" variant="outline" size="sm" disabled={busy} className="mb-2 w-full shrink-0" onClick={() => void toggleTrust(false)}>
            {t("admin.settings.security.devices.untrust")}
          </Button>
        ) : (
          <Button type="button" size="sm" disabled={busy} className="mb-2 w-full bg-brand-navy hover:bg-brand-navy/92" onClick={() => void toggleTrust(true)}>
            {t("admin.settings.security.devices.trust")}
          </Button>
        )}
        <Badge variant="outline" className={d.trusted ? "border-emerald-400 bg-emerald-50 text-emerald-950" : ""}>{d.trusted ? t("admin.settings.security.devices.badges.trusted") : t("admin.settings.security.devices.badges.unknown")}</Badge>
      </TableCell>
    </TableRow>
  );
}
