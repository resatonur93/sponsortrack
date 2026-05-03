"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ProtectedError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): JSX.Element {
  useEffect(() => {
    console.error("[protected/error]", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="max-w-md w-full rounded-xl border border-red-200 bg-white p-8 text-center shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900 mb-2">
          Bir hata oluştu
        </h2>
        <p className="text-sm text-slate-500 mb-6">
          {error.digest ? `Hata kodu: ${error.digest}` : "Bu sayfa yüklenirken bir sorun oluştu."}
        </p>
        <div className="flex justify-center gap-3">
          <button
            onClick={reset}
            className="rounded-md bg-blue-900 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
          >
            Tekrar Dene
          </button>
          <Link
            href="/dashboard"
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Dashboard&apos;a Dön
          </Link>
        </div>
      </div>
    </div>
  );
}
