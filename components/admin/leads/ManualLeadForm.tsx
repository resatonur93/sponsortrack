"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
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
import { AdminSurfaceCard } from "@/components/admin/shell/AdminPageShell";
import { useTranslation } from "@/contexts/LanguageContext";
import type { LeadFormFieldKey } from "@/lib/lead-form/field-keys";
import type {
  LeadFormConfigDTO,
  LeadFormFieldDTO,
} from "@/lib/lead-form/types";
import { cn } from "@/lib/utils";

function stateKey(fieldKey: LeadFormFieldKey): string {
  return fieldKey === "company" ? "companyName" : fieldKey;
}

export function ManualLeadForm(props: {
  canAccessAdmin: boolean;
}): JSX.Element {
  const { t } = useTranslation();
  const router = useRouter();

  const [cfgLoading, setCfgLoading] = useState(true);
  const [cfgError, setCfgError] = useState<string | null>(null);
  const [cfg, setCfg] = useState<LeadFormConfigDTO | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});

  const [saving, setSaving] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    if (!props.canAccessAdmin) return;
    setCfgLoading(true);
    setCfgError(null);
    try {
      const res = await fetch("/api/admin/lead-form-config", {
        credentials: "include",
        cache: "no-store",
      });
      const json = (await res.json().catch(() => ({}))) as {
        data?: LeadFormConfigDTO;
      };
      if (!res.ok || !json.data) {
        setCfgError(t("common.errorLoad"));
        return;
      }
      const nextValues: Record<string, string> = {};
      const firstActive = json.data.sources
        .filter((s) => s.isActive)
        .sort((a, b) => a.sortOrder - b.sortOrder)[0];
      json.data.fields
        .filter((f) => f.enabled)
        .forEach((f) => {
          const sk = stateKey(f.fieldKey);
          if (f.fieldKey === "source") {
            nextValues[sk] = firstActive?.value ?? "admin_manual";
          } else {
            nextValues[sk] = "";
          }
        });
      setCfg(json.data);
      setValues(nextValues);
    } catch {
      setCfgError(t("common.errorLoad"));
    } finally {
      setCfgLoading(false);
    }
  }, [props.canAccessAdmin, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const visibleFields = useMemo(() => {
    if (!cfg) return [];
    return [...cfg.fields]
      .filter((f) => f.enabled)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }, [cfg]);

  const sourceOptions = useMemo(() => {
    if (!cfg) return [];
    return [...cfg.sources]
      .filter((s) => s.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }, [cfg]);

  async function submit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setErrorBanner(null);
    setFieldErrors({});
    setSaving(true);
    try {
      const rawSource = (values.source ?? "").trim().toLowerCase();
      const payload = {
        firstName: values.firstName ?? "",
        lastName: values.lastName ?? "",
        email: values.email ?? "",
        phone: values.phone ?? "",
        companyName: values.companyName ?? "",
        message: values.message ?? "",
        source:
          visibleFields.some((x) => x.fieldKey === "source") && rawSource.length > 0
            ? rawSource
            : "admin_manual",
      };

      const res = await fetch("/api/admin/leads", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json().catch(() => ({}))) as {
        data?: { id: string };
        fieldErrors?: Record<string, string>;
      };
      if (!res.ok) {
        setErrorBanner(t("admin.leads.new.error"));
        if (json.fieldErrors && typeof json.fieldErrors === "object") {
          const mapped: Record<string, string> = {};
          for (const [k, v] of Object.entries(json.fieldErrors)) {
            if (typeof v !== "string") continue;
            if (k === "company") mapped.companyName = v;
            else mapped[k] = v;
          }
          setFieldErrors(mapped);
        }
        return;
      }
      const id = json.data?.id;
      if (id) router.replace(`/admin/leads/${id}`);
      else router.replace("/admin/leads");
    } finally {
      setSaving(false);
    }
  }

  function setVal(key: string, v: string): void {
    setValues((prev) => ({ ...prev, [key]: v }));
    setFieldErrors((prev) => {
      const n = { ...prev };
      delete n[key];
      return n;
    });
  }

  if (!props.canAccessAdmin) {
    return <p className="text-brand-slate">{t("common.loading")}</p>;
  }

  if (cfgLoading || !cfg) {
    return cfgError ? (
      <AdminSurfaceCard className="space-y-4 p-6">
        <p className="text-sm font-medium text-red-700">{cfgError}</p>
        <Button type="button" variant="outline" onClick={() => void load()}>
          {t("common.retry")}
        </Button>
      </AdminSurfaceCard>
    ) : (
      <p className="text-brand-slate">{t("common.loading")}</p>
    );
  }

  function renderControl(f: LeadFormFieldDTO): JSX.Element | null {
    const sk = stateKey(f.fieldKey);
    const err = fieldErrors[sk];
    const base = cn(
      "border-brand-navy/15",
      err && "border-red-400 ring-1 ring-red-200 focus-visible:ring-red-400"
    );
    const id = `lead-${sk}`;

    if (f.fieldKey === "source") {
      return (
        <div key={sk} className="space-y-2">
          <Label htmlFor={id} className="text-brand-navy">
            {f.label}{" "}
            {f.required ? <span className="text-red-600">*</span> : null}
          </Label>
          {sourceOptions.length === 0 ? (
          <p className="text-sm text-red-700">
            {t("admin.leads.new.noSourcesActive")}
          </p>
        ) : (
          <Select
            value={
              values[sk] &&
              sourceOptions.some((o) => o.value === values[sk])
                ? values[sk]
                : sourceOptions[0]?.value ?? ""
            }
            onValueChange={(v) => setVal(sk, v)}
          >
            <SelectTrigger id={id} className={base}>
              <SelectValue placeholder={t("admin.leads.new.pickSource")} />
            </SelectTrigger>
            <SelectContent>
              {sourceOptions.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}{" "}
                  <span className="font-mono text-[11px] text-brand-slate">
                    ({s.value})
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
          {err ? <p className="text-xs text-red-700">{err}</p> : null}
        </div>
      );
    }

    if (f.fieldKey === "message") {
      return (
        <div key={sk} className="space-y-2">
          <Label htmlFor={id} className="text-brand-navy">
            {f.label}{" "}
            {f.required ? <span className="text-red-600">*</span> : null}
          </Label>
          <textarea
            id={id}
            rows={4}
            value={values[sk] ?? ""}
            placeholder={f.placeholder ?? undefined}
            onChange={(e) => setVal(sk, e.target.value)}
            className={cn(
              base,
              "flex w-full resize-y rounded-md border bg-white px-3 py-2 text-sm shadow-sm",
              "placeholder:text-brand-slate/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy/20"
            )}
          />
          {err ? <p className="text-xs text-red-700">{err}</p> : null}
        </div>
      );
    }

    const inputType =
      f.fieldKey === "email" ? "email" : f.fieldKey === "phone" ? "tel" : "text";

    return (
      <div key={sk} className="space-y-2">
        <Label htmlFor={id} className="text-brand-navy">
          {f.label}{" "}
          {f.required ? <span className="text-red-600">*</span> : null}
        </Label>
        <Input
          id={id}
          type={inputType}
          value={values[sk] ?? ""}
          placeholder={f.placeholder ?? undefined}
          autoComplete={
            sk === "email"
              ? "email"
              : sk === "phone"
                ? "tel"
                : sk === "firstName"
                  ? "given-name"
                  : sk === "lastName"
                    ? "family-name"
                    : undefined
          }
          onChange={(e) => setVal(sk, e.target.value)}
          className={base}
        />
        {err ? <p className="text-xs text-red-700">{err}</p> : null}
      </div>
    );
  }

  return (
    <AdminSurfaceCard className="space-y-4 p-6">
      <p className="text-sm leading-relaxed text-brand-slate">
        {t("admin.leads.new.fieldHints")}
      </p>
      <form className="space-y-5" onSubmit={(e) => void submit(e)}>
        {errorBanner ? (
          <p className="text-sm font-semibold text-red-700">{errorBanner}</p>
        ) : null}
        <div className="space-y-5">
          {visibleFields.map((f) => renderControl(f)).filter(Boolean)}
        </div>
        <div className="flex flex-wrap gap-3 pt-2">
          <Button
            type="submit"
            disabled={saving}
            className="bg-brand-navy font-bold hover:bg-brand-navy/92"
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {saving ? t("admin.leads.new.saving") : t("admin.leads.new.submit")}
          </Button>
          <Button type="button" variant="outline" className="border-brand-navy/25" asChild>
            <Link href="/admin/leads">{t("admin.leads.new.cancel")}</Link>
          </Button>
        </div>
      </form>
    </AdminSurfaceCard>
  );
}
