import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function SetupDbUnavailable(): JSX.Element {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-xl text-blue-900">Veritabanına bağlanılamıyor</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-700">
          <p>
            İlk kurulum için uygulamanın PostgreSQL&apos;e erişmesi gerekir. Sunucuda{" "}
            <code className="rounded bg-slate-200 px-1">DATABASE_URL</code> değerini kontrol edin
            (Railway / Coolify Postgres iç adresi; <code className="rounded bg-slate-200 px-1">host.docker.internal</code>{" "}
            genelde sadece yerel Docker içindir).
          </p>
          <p>
            <Link href="/login" className="text-blue-800 underline">
              Giriş sayfasına dön
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export function RegistrationNotConfigured(): JSX.Element {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-xl text-blue-900">Kurumsal kayıt kapalı</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-700">
          <p>
            Bu özellik için sunucu ortamında{" "}
            <code className="rounded bg-slate-200 px-1">REGISTRATION_SECRET</code> tanımlanmalıdır.
            Yönetici panelinden veya hosting ayarlarından uzun rastgele bir değer ekleyin, ardından bu sayfayı yenileyin.
          </p>
          <p>
            <Link href="/login" className="text-blue-800 underline">
              Giriş sayfasına dön
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
