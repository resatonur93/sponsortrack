"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

export default function SelfServiceDashboardPage(): JSX.Element {
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
        setError("Could not load profile");
        return;
      }
      const json = (await res.json()) as { data: Profile };
      setProfile(json.data);
    })();
  }, [router]);

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
    return <p className="text-sm text-slate-600">Loading…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold text-brand-navy">
          Hello, {profile.firstName}
        </h1>
        <Button type="button" variant="outline" size="sm" onClick={() => void logout()}>
          Sign out
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your details</CardTitle>
          <p className="text-xs text-slate-500">
            Work email and name are read-only. You can request updates to contact
            fields — your employer will be notified for compliance review.
          </p>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Row label="Name" value={`${profile.firstName} ${profile.lastName}`} />
          <Row label="Work email" value={profile.workEmail} />
          <Row label="Status" value={profile.employmentStatus} />
          <Row label="Address" value={profile.currentAddress ?? "—"} />
          <Row label="Phone" value={profile.phone ?? "—"} />
          <Row label="Personal email" value={profile.personalEmail ?? "—"} />
          <Row label="Emergency contact" value={profile.emergencyContact ?? "—"} />
          <Row label="Emergency phone" value={profile.emergencyPhone ?? "—"} />
        </CardContent>
      </Card>
      <Button asChild className="w-full">
        <Link href="/self-service/update">Update contact details</Link>
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
