"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AdminSettingsPage(): JSX.Element {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") router.replace("/login");
    else if (session?.user?.role !== "AUTHORISING_OFFICER") router.replace("/dashboard");
  }, [status, session, router]);

  if (status === "loading" || !session) {
    return <p className="text-slate-400">Yükleniyor...</p>;
  }
  if (session.user.role !== "AUTHORISING_OFFICER") {
    return <p className="text-slate-400">Yönlendiriliyor...</p>;
  }

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold text-slate-50">Admin ayarları</h1>
      <p className="text-slate-400">
        Lead form zorunlu alanları, e-posta bildirimleri ve kullanıcı yönetimi için yapılandırma
        yakında eklenecek.
      </p>
    </div>
  );
}
