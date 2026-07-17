"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/contexts/LanguageContext";

type Profile = {
  workerId: string;
  firstName: string;
  lastName: string;
  workEmail: string;
  employmentStatus: string;
  currentAddress: string | null;
  phone: string | null;
  personalEmail: string | null;
  emergencyContact: string | null;
  emergencyPhone: string | null;
};

function tEnum(
  translate: (key: string, fallback?: string) => string,
  key: string,
  fallback: string
): string {
  const v = translate(key, fallback);
  return v === key ? fallback : v;
}

export default function SelfServiceDashboardPage(): JSX.Element {
  const { t } = useTranslation();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/self-service/profile", {
        credentials: "include",
        cache: "no-store",
      });
      if (res.status === 401) {
        router.replace("/self-service/login");
        return;
      }
      if (!res.ok) {
        setError(t("selfService.loadFailed"));
        return;
      }
      const json = (await res.json()) as { data: Profile };
      setProfile(json.data);
    })();
  }, [router, t]);

  async function logout(): Promise<void> {
    await fetch("/api/self-service/logout", {
      method: "POST",
      credentials: "include",
    });
    router.replace("/self-service/login");
    router.refresh();
  }

  if (error) {
    return <p className="text-sm text-brand-rose">{error}</p>;
  }
  if (!profile) {
    return <p className="text-sm text-slate-600">{t("common.loading")}</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold text-brand-navy">
          {t("selfService.hello")}, {profile.firstName}
        </h1>
        <Button type="button" variant="outline" size="sm" onClick={() => void logout()}>
          {t("selfService.signOut")}
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("selfService.yourDetails")}</CardTitle>
          <p className="text-xs text-slate-500">{t("selfService.readOnlyHint")}</p>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Row label={t("selfService.name")} value={`${profile.firstName} ${profile.lastName}`} />
          <Row label={t("selfService.workEmail")} value={profile.workEmail} />
          <Row
            label={t("selfService.status")}
            value={tEnum(
              t,
              `workerDetail.employment.${profile.employmentStatus}`,
              profile.employmentStatus
            )}
          />
          <Row label={t("selfService.address")} value={profile.currentAddress ?? "—"} />
          <Row label={t("selfService.phone")} value={profile.phone ?? "—"} />
          <Row label={t("selfService.personalEmail")} value={profile.personalEmail ?? "—"} />
          <Row
            label={t("selfService.emergencyContact")}
            value={profile.emergencyContact ?? "—"}
          />
          <Row label={t("selfService.emergencyPhone")} value={profile.emergencyPhone ?? "—"} />
        </CardContent>
      </Card>
      <Button asChild className="w-full">
        <Link href="/self-service/update">{t("selfService.updateContact")}</Link>
      </Button>
    </div>
  );
}

function Row(props: { label: string; value: string }): JSX.Element {
  return (
    <div>
      <p className="text-xs text-slate-500">{props.label}</p>
      <p className="font-medium text-slate-900">{props.value}</p>
    </div>
  );
}
