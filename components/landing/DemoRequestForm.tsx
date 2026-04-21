"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  className?: string;
};

export function DemoRequestForm({ className }: Props): JSX.Element {
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setStatus("loading");
    setError(null);
    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        companyName,
        name: name.trim() || undefined,
        phone: phone.trim() || undefined,
        message: message.trim() || undefined,
        source: "demo_request",
      }),
    });
    if (!res.ok) {
      const j = (await res.json()) as { error?: string };
      setError(j.error ?? "Gönderilemedi. Tekrar deneyin.");
      setStatus("error");
      return;
    }
    setStatus("success");
    setEmail("");
    setCompanyName("");
    setName("");
    setPhone("");
    setMessage("");
  }

  if (status === "success") {
    return (
      <div
        className={
          className ??
          "rounded-lg border border-emerald-200 bg-emerald-50 p-6 text-emerald-900"
        }
      >
        <p className="font-medium">Teşekkürler</p>
        <p className="mt-2 text-sm">
          Demo talebiniz alındı. Ekibimiz en kısa sürede size dönüş yapacaktır.
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-4"
          onClick={() => setStatus("idle")}
        >
          Yeni talep
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className={className ?? "space-y-4 rounded-lg border bg-card p-6 shadow-sm"}
    >
      <div className="space-y-2">
        <Label htmlFor="demo-email">E-posta</Label>
        <Input
          id="demo-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="demo-company">Şirket adı</Label>
        <Input
          id="demo-company"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          required
          autoComplete="organization"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="demo-name">Ad (isteğe bağlı)</Label>
        <Input
          id="demo-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="demo-phone">Telefon (isteğe bağlı)</Label>
        <Input
          id="demo-phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          autoComplete="tel"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="demo-message">Mesaj (isteğe bağlı)</Label>
        <textarea
          id="demo-message"
          className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </div>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" className="w-full" disabled={status === "loading"}>
        {status === "loading" ? "Gönderiliyor..." : "Request Demo"}
      </Button>
    </form>
  );
}
