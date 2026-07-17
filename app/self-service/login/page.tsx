"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/contexts/LanguageContext";

export default function SelfServiceLoginPage(): JSX.Element {
  const { t } = useTranslation();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [portalToken, setPortalToken] = useState("");
  const [mode, setMode] = useState<"dob" | "token">("dob");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const body =
      mode === "token"
        ? { portalToken: portalToken.trim() }
        : { email: email.trim(), dateOfBirth: dateOfBirth.trim() };
    const res = await fetch("/api/self-service/login", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      setError(j.error ?? t("selfService.loginFailed"));
      return;
    }
    router.push("/self-service/dashboard");
    router.refresh();
  }

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg">{t("selfService.loginTitle")}</CardTitle>
        <p className="text-sm text-slate-600">{t("selfService.loginHint")}</p>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex gap-2">
          <Button
            type="button"
            size="sm"
            variant={mode === "dob" ? "default" : "outline"}
            onClick={() => setMode("dob")}
          >
            {t("selfService.modeDob")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mode === "token" ? "default" : "outline"}
            onClick={() => setMode("token")}
          >
            {t("selfService.modeToken")}
          </Button>
        </div>
        <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
          {mode === "dob" ? (
            <>
              <div className="space-y-1">
                <Label htmlFor="email">{t("selfService.email")}</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="dob">{t("selfService.dob")}</Label>
                <Input
                  id="dob"
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  required
                />
              </div>
            </>
          ) : (
            <div className="space-y-1">
              <Label htmlFor="token">{t("selfService.token")}</Label>
              <Input
                id="token"
                value={portalToken}
                onChange={(e) => setPortalToken(e.target.value)}
                required
                className="font-mono text-xs"
              />
            </div>
          )}
          {error ? <p className="text-sm text-brand-rose">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? t("selfService.signingIn") : t("selfService.continue")}
          </Button>
        </form>
        <p className="mt-4 text-center text-xs text-slate-500">
          <Link href="/login" className="text-brand-navy underline">
            {t("selfService.staffLogin")}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
