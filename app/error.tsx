"use client";

import { useEffect } from "react";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): JSX.Element {
  useEffect(() => {
    console.error("[app/error]", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="max-w-md w-full rounded-xl border border-red-200 bg-white p-8 text-center shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900 mb-2">
          Bir hata oluştu
        </h2>
        <p className="text-sm text-slate-500 mb-6">
          {error.digest ? `Hata kodu: ${error.digest}` : "Lütfen tekrar deneyin."}
        </p>
        <button
          onClick={reset}
          className="rounded-md bg-blue-900 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
        >
          Tekrar Dene
        </button>
      </div>
    </div>
  );
}
