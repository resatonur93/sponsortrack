"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): JSX.Element {
  return (
    <html lang="tr">
      <body className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md w-full rounded-xl border border-red-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-slate-900 mb-2">
            Beklenmeyen bir hata oluştu
          </h1>
          <p className="text-sm text-slate-500 mb-6">
            {error.digest ? `Hata kodu: ${error.digest}` : "Lütfen sayfayı yenileyin veya daha sonra tekrar deneyin."}
          </p>
          <button
            onClick={reset}
            className="rounded-md bg-blue-900 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
          >
            Tekrar Dene
          </button>
        </div>
      </body>
    </html>
  );
}
