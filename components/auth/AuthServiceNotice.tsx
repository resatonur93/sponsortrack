import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function SetupDbUnavailable({ hint }: { hint?: string }): JSX.Element {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-xl text-brand-navy">Kurulum şu an yapılamıyor</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-700">
          {hint ? (
            <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-slate-800">
              {hint}
            </p>
          ) : null}
          <p>
            <strong>Sık nedenler:</strong> Projede artık migration dosyaları var; canlıda{" "}
            <code className="rounded bg-slate-200 px-1">npm run db:deploy</code> veya konteyner
            başlarken varsayılan <code className="rounded bg-slate-200 px-1">npm start</code> (içinde{" "}
            <code className="rounded bg-slate-200 px-1">prisma migrate deploy</code>) şemayı oluşturur.
          </p>
          <p>
            Uzak Postgres çoğu zaman{" "}
            <code className="rounded bg-slate-200 px-1">?sslmode=require</code> ister.{" "}
            <code className="rounded bg-slate-200 px-1">DATABASE_URL</code> uygulama konteynerindeki
            değerle (host.docker.internal değil) eşleşmeli.
          </p>
          <p>
            <Link href="/login" className="font-medium text-brand-royal underline">
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
          <CardTitle className="text-xl text-brand-navy">Kurumsal kayıt kapalı</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-700">
          <p>
            Bu özellik için sunucu ortamında{" "}
            <code className="rounded bg-slate-200 px-1">REGISTRATION_SECRET</code> tanımlanmalıdır.
            Yönetici panelinden veya hosting ayarlarından uzun rastgele bir değer ekleyin, ardından bu sayfayı yenileyin.
          </p>
          <p>
            <Link href="/login" className="font-medium text-brand-royal underline">
              Giriş sayfasına dön
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export function SetupAlreadyCompleted(): JSX.Element {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-xl text-brand-navy">İlk kurulum tamamlandı</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-700">
          <p>
            Bu sayfa sadece ilk yönetici hesabı oluşturulana kadar kullanılabilir. Kurulum
            tamamlandığı için artık giriş yapmanız gerekir.
          </p>
          <p>
            <Link href="/login" className="font-medium text-brand-royal underline">
              Giriş sayfasına dön
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
