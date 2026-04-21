"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";

export default function AdminAuditPage(): JSX.Element {
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
      <h1 className="text-2xl font-bold text-slate-50">Audit</h1>
      <p className="text-slate-400">
        Kiracı bazlı uyum denetimi ve audit pack için uygulama içi araçlara geçin.
      </p>
      <Link
        href="/compliance/audit"
        className="inline-flex rounded-md bg-[#1E5BB5] px-4 py-2 text-sm font-medium text-white hover:bg-[#1a4fa0]"
      >
        Compliance audit pack →
      </Link>
    </div>
  );
}
