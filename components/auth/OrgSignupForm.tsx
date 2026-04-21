"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/branding/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Mode = "setup" | "register";

const copy: Record<Mode, { title: string; subtitle: string }> = {
  setup: {
    title: "Yeni kurum kaydı",
    subtitle: "Yeni bir şirket (tenant) ve yetkili kullanıcı oluşturun. Aynı e-posta ile ikinci kayıt yapılamaz.",
  },
  register: {
    title: "Kurumsal kayıt",
    subtitle: "Yeni sponsor hesabı — kayıt anahtarı gerekir.",
  },
};

export function OrgSignupForm({ mode }: { mode: Mode }): JSX.Element {
  const router = useRouter();
  const [companyName, setCompanyName] = useState("");
  const [licenceNumber, setLicenceNumber] = useState("");
  const [address, setAddress] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [registrationSecret, setRegistrationSecret] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError("Şifreler eşleşmiyor.");
      return;
    }
    if (password.length < 8) {
      setError("Şifre en az 8 karakter olmalı.");
      return;
    }
    setLoading(true);
    const path = mode === "setup" ? "/api/setup" : "/api/register";
    const body =
      mode === "setup"
        ? {
            companyName,
            licenceNumber,
            address: address.trim() || undefined,
            firstName,
            lastName,
            email,
            password,
          }
        : {
            companyName,
            licenceNumber,
            address: address.trim() || undefined,
            firstName,
            lastName,
            email,
            password,
            registrationSecret,
          };

    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as { error?: string };
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "İşlem başarısız.");
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const signRes = await signIn("credentials", {
      redirect: false,
      email: normalizedEmail,
      password,
    });
    if (signRes?.error) {
      setError("Hesap oluştu; giriş için /login sayfasını kullanın.");
      router.push("/login");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  const meta = copy[mode];

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center pb-6">
          <Logo size="md" variant="light" className="mb-4" />
          <p className="text-caption">Compliance Made Clear</p>
          <CardTitle className="mt-2 text-2xl text-brand-navy">{meta.title}</CardTitle>
          <p className="mt-1 text-center text-sm text-brand-slate">{meta.subtitle}</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Şirket adı</Label>
              <Input
                id="companyName"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
                autoComplete="organization"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="licenceNumber">Lisans numarası (Sponsor licence)</Label>
              <Input
                id="licenceNumber"
                value={licenceNumber}
                onChange={(e) => setLicenceNumber(e.target.value)}
                required
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Adres (isteğe bağlı)</Label>
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                autoComplete="street-address"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="firstName">Ad</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  autoComplete="given-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Soyad</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  autoComplete="family-name"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-posta</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Şifre</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Şifre tekrar</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
            {mode === "register" ? (
              <div className="space-y-2">
                <Label htmlFor="registrationSecret">Kayıt anahtarı</Label>
                <Input
                  id="registrationSecret"
                  type="password"
                  value={registrationSecret}
                  onChange={(e) => setRegistrationSecret(e.target.value)}
                  required
                  autoComplete="off"
                />
              </div>
            ) : null}
            {error ? (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            ) : null}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Kaydediliyor..." : mode === "setup" ? "Kurulumu tamamla" : "Kayıt ol"}
            </Button>
            <p className="text-center text-sm text-slate-600">
              <Link href="/login" className="font-medium text-brand-royal underline">
                Giriş sayfasına dön
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
