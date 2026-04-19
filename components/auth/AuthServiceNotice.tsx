import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function SetupDbUnavailable({ hint }: { hint?: string }): JSX.Element {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-xl text-blue-900">Kurulum şu an yapılamıyor</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-700">
          {hint ? (
            <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-slate-800">
              {hint}
            </p>
          ) : null}
          <p>
            <strong>Sık nedenler:</strong> Veritabanına bağlanıyor olsanız bile{" "}
            <code className="rounded bg-slate-200 px-1">prisma db push</code> hiç çalışmadıysa tablolar
            yoktur. Coolify/Railway’de release/post-deploy komutu veya SSH ile bir kez uygulayın.
          </p>
          <p>
            Uzak Postgres çoğu zaman{" "}
            <code className="rounded bg-slate-200 px-1">?sslmode=require</code> ister.{" "}
            <code className="rounded bg-slate-200 px-1">DATABASE_URL</code> uygulama konteynerindeki
            değerle (host.docker.internal değil) eşleşmeli.
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
