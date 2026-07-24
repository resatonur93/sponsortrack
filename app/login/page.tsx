"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/branding/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useTranslation } from "@/contexts/LanguageContext";

type Step = "credentials" | "otp";

export default function LoginPage(): JSX.Element {
  const router = useRouter();
  const { t, locale } = useTranslation();
  const [step, setStep] = useState<Step>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const id = setInterval(() => {
      setResendSeconds((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [resendSeconds]);

  async function requestOtp(): Promise<boolean> {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, locale }),
      });
      const body: {
        data?: { challengeId: string; resendAvailableInSeconds: number };
        error?: string;
        retryAfterSeconds?: number;
      } = await res.json().catch(() => ({}));

      if (!res.ok || !body.data) {
        if (res.status === 429) {
          setError(
            body.error === "cooldown" && body.retryAfterSeconds
              ? `${t("login.otp.errorTooManyRequests")} (${body.retryAfterSeconds}s)`
              : t("login.otp.errorTooManyRequests")
          );
        } else if (res.status === 502) {
          setError(t("login.otp.errorSendFailed"));
        } else {
          setError(t("login.error"));
        }
        return false;
      }

      setChallengeId(body.data.challengeId);
      setResendSeconds(body.data.resendAvailableInSeconds);
      return true;
    } finally {
      setLoading(false);
    }
  }

  async function onCredentialsSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    const ok = await requestOtp();
    if (ok) {
      setOtpCode("");
      setStep("otp");
    }
  }

  async function onResend(): Promise<void> {
    if (resendSeconds > 0 || loading) return;
    await requestOtp();
  }

  function onBack(): void {
    setStep("credentials");
    setOtpCode("");
    setChallengeId(null);
    setError(null);
  }

  async function onOtpSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!challengeId) return;
    setLoading(true);
    setError(null);
    const res = await signIn("credentials", {
      redirect: false,
      email,
      password,
      otpCode,
      challengeId,
    });
    setLoading(false);
    if (res?.error) {
      if (res.error === "OTP_INVALID_CODE") {
        setError(t("login.otp.errorInvalid"));
        setOtpCode("");
      } else if (res.error === "OTP_LOCKED") {
        setError(t("login.otp.errorLocked"));
        setStep("credentials");
        setOtpCode("");
        setChallengeId(null);
      } else if (
        res.error === "OTP_EXPIRED" ||
        res.error === "OTP_NOT_FOUND" ||
        res.error === "OTP_CONSUMED"
      ) {
        setError(t("login.otp.errorExpired"));
        setOtpCode("");
      } else {
        setError(t("login.error"));
        setStep("credentials");
        setOtpCode("");
        setChallengeId(null);
      }
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background p-4">
      <div className="absolute right-4 top-4">
        <LanguageSwitcher />
      </div>
      <Card className="w-full max-w-md">
        <CardHeader className="items-center pb-6">
          <Logo size="lg" variant="light" />
          {step === "credentials" ? (
            <>
              <p className="text-caption mt-3 text-center">{t("login.tagline")}</p>
              <p className="mt-1 text-center text-sm text-brand-slate">
                {t("login.subtitle")}
              </p>
            </>
          ) : (
            <>
              <p className="text-caption mt-3 text-center">{t("login.otp.title")}</p>
              <p className="mt-1 text-center text-sm text-brand-slate">
                {t("login.otp.subtitle")} <span className="font-medium">{email}</span>
              </p>
            </>
          )}
        </CardHeader>
        <CardContent>
          {step === "credentials" ? (
            <form onSubmit={onCredentialsSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t("login.email")}</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  inputMode="email"
                  enterKeyHint="next"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-invalid={error ? true : undefined}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t("login.password")}</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  enterKeyHint="done"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={error ? true : undefined}
                  required
                />
              </div>
              {error ? (
                <p className="text-sm text-brand-rose" role="alert">
                  {error}
                </p>
              ) : null}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? t("login.submitting") : t("login.submit")}
              </Button>
              <div className="space-y-1 text-center text-sm text-brand-slate">
                <p>
                  <Link href="/demo" className="font-medium text-brand-royal underline">
                    {t("login.demo")}
                  </Link>
                </p>
                <p>
                  <Link href="/setup" className="font-medium text-brand-royal underline">
                    {t("login.setup")}
                  </Link>
                  {" · "}
                  <Link href="/register" className="font-medium text-brand-royal underline">
                    {t("login.register")}
                  </Link>
                </p>
              </div>
            </form>
          ) : (
            <form onSubmit={onOtpSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otpCode">{t("login.otp.codeLabel")}</Label>
                <Input
                  id="otpCode"
                  name="otpCode"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  enterKeyHint="done"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  aria-invalid={error ? true : undefined}
                  autoFocus
                  required
                />
              </div>
              {error ? (
                <p className="text-sm text-brand-rose" role="alert">
                  {error}
                </p>
              ) : null}
              <Button
                type="submit"
                className="w-full"
                disabled={loading || otpCode.length !== 6}
              >
                {loading ? t("login.submitting") : t("login.otp.submit")}
              </Button>
              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={onBack}
                  className="font-medium text-brand-royal underline"
                >
                  {t("login.otp.back")}
                </button>
                <button
                  type="button"
                  onClick={() => void onResend()}
                  disabled={resendSeconds > 0 || loading}
                  className="font-medium text-brand-royal underline disabled:cursor-not-allowed disabled:text-brand-slate disabled:no-underline"
                >
                  {resendSeconds > 0
                    ? `${t("login.otp.resendIn")} ${resendSeconds}s`
                    : t("login.otp.resend")}
                </button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
