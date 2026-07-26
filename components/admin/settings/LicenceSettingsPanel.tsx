"use client";

import { useCallback, useEffect, useState } from "react";
import { CreditCard, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AdminSurfaceCard } from "@/components/admin/shell/AdminPageShell";
import { useTranslation } from "@/contexts/LanguageContext";

type LicenceDto = {
  companyName: string;
  licenceNumber: string;
  licenceType: string | null;
  licenceRating: string | null;
  licenceExpiryDate: string | null;
};

export function LicenceSettingsPanel(): JSX.Element {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [licence, setLicence] = useState<LicenceDto | null>(null);
  const [licenceType, setLicenceType] = useState("");
  const [licenceRating, setLicenceRating] = useState("");
  const [licenceExpiryDate, setLicenceExpiryDate] = useState("");
  const [message, setMessage] = useState<{ variant: "ok" | "err"; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/settings/licence", { credentials: "include", cache: "no-store" });
    if (res.ok) {
      const json = (await res.json()) as { data: LicenceDto };
      setLicence(json.data);
      setLicenceType(json.data.licenceType ?? "");
      setLicenceRating(json.data.licenceRating ?? "");
      setLicenceExpiryDate(json.data.licenceExpiryDate ? json.data.licenceExpiryDate.slice(0, 10) : "");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(): Promise<void> {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/settings/licence", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          licenceType: licenceType.trim() || null,
          licenceRating: licenceRating.trim() || null,
          licenceExpiryDate: licenceExpiryDate ? new Date(licenceExpiryDate).toISOString() : null,
        }),
      });
      if (res.ok) {
        const json = (await res.json()) as { data: LicenceDto };
        setLicence(json.data);
        setMessage({ variant: "ok", text: t("admin.settings.licence.saved") });
      } else {
        setMessage({ variant: "err", text: t("admin.settings.licence.saveFailed") });
      }
    } catch {
      setMessage({ variant: "err", text: t("admin.settings.licence.saveFailed") });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <AdminSurfaceCard className="p-6">
        <p className="text-sm text-brand-slate">{t("common.loading")}</p>
      </AdminSurfaceCard>
    );
  }

  return (
    <AdminSurfaceCard className="p-6 md:p-8">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-navy/[0.08] text-brand-navy ring-1 ring-brand-navy/10">
          <CreditCard className="h-5 w-5" aria-hidden />
        </div>
        <div>
          <h2 className="text-lg font-bold text-brand-navy">{t("admin.settings.licence.title")}</h2>
          <p className="text-sm text-brand-slate">{t("admin.settings.licence.subtitle")}</p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>{t("admin.settings.licence.companyName")}</Label>
          <Input value={licence?.companyName ?? ""} disabled className="border-brand-navy/15" />
        </div>
        <div className="space-y-1.5">
          <Label>{t("admin.settings.licence.licenceNumber")}</Label>
          <Input value={licence?.licenceNumber ?? ""} disabled className="border-brand-navy/15" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="licence-type">{t("admin.settings.licence.type")}</Label>
          <Input
            id="licence-type"
            value={licenceType}
            onChange={(e) => setLicenceType(e.target.value)}
            placeholder={t("admin.settings.licence.typePlaceholder")}
            className="border-brand-navy/15"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="licence-rating">{t("admin.settings.licence.rating")}</Label>
          <Input
            id="licence-rating"
            value={licenceRating}
            onChange={(e) => setLicenceRating(e.target.value)}
            placeholder={t("admin.settings.licence.ratingPlaceholder")}
            className="border-brand-navy/15"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="licence-expiry">{t("admin.settings.licence.expiry")}</Label>
          <Input
            id="licence-expiry"
            type="date"
            value={licenceExpiryDate}
            onChange={(e) => setLicenceExpiryDate(e.target.value)}
            className="border-brand-navy/15"
          />
        </div>
      </div>
      <div className="mt-5 flex items-center gap-3">
        <Button type="button" className="gap-2" disabled={saving} onClick={() => void save()}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Save className="h-4 w-4" aria-hidden />}
          {t("common.save")}
        </Button>
        {message ? (
          <p className={message.variant === "ok" ? "text-sm text-emerald-700" : "text-sm text-red-700"}>
            {message.text}
          </p>
        ) : null}
      </div>
    </AdminSurfaceCard>
  );
}
