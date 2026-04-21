"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Profile = {
  currentAddress: string | null;
  phone: string | null;
  personalEmail: string | null;
  emergencyContact: string | null;
  emergencyPhone: string | null;
};

export default function SelfServiceUpdatePage(): JSX.Element {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentAddress, setCurrentAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [personalEmail, setPersonalEmail] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");

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
      setLoading(false);
      if (!res.ok) return;
      const json = (await res.json()) as { data: Profile };
      const p = json.data;
      setCurrentAddress(p.currentAddress ?? "");
      setPhone(p.phone ?? "");
      setPersonalEmail(p.personalEmail ?? "");
      setEmergencyContact(p.emergencyContact ?? "");
      setEmergencyPhone(p.emergencyPhone ?? "");
    })();
  }, [router]);

  async function onSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await fetch("/api/self-service/profile", {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentAddress: currentAddress.trim() || null,
        phone: phone.trim() || null,
        personalEmail: personalEmail.trim() || null,
        emergencyContact: emergencyContact.trim() || null,
        emergencyPhone: emergencyPhone.trim() || null,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      setError(j.error ?? "Update failed");
      return;
    }
    router.push("/self-service/dashboard");
    router.refresh();
  }

  if (loading) {
    return <p className="text-sm text-slate-600">Loading…</p>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Update contact details</CardTitle>
        <p className="text-xs text-slate-500">
          Saving creates compliance events and notifies HR where required.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="addr">Address</Label>
            <textarea
              id="addr"
              className="min-h-[88px] w-full rounded-md border border-slate-300 p-2 text-sm"
              value={currentAddress}
              onChange={(e) => setCurrentAddress(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="pemail">Personal email</Label>
            <Input
              id="pemail"
              type="email"
              value={personalEmail}
              onChange={(e) => setPersonalEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="ec">Emergency contact name</Label>
            <Input
              id="ec"
              value={emergencyContact}
              onChange={(e) => setEmergencyContact(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="eph">Emergency contact phone</Label>
            <Input
              id="eph"
              type="tel"
              value={emergencyPhone}
              onChange={(e) => setEmergencyPhone(e.target.value)}
            />
          </div>
          {error ? <p className="text-sm text-brand-rose">{error}</p> : null}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="submit" disabled={saving} className="flex-1">
              {saving ? "Saving…" : "Save changes"}
            </Button>
            <Button type="button" variant="outline" asChild className="flex-1">
              <Link href="/self-service/dashboard">Cancel</Link>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
