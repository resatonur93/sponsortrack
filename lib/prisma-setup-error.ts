import { Prisma } from "@prisma/client";

/** İlk kurulum sayfasında Prisma hatasını kullanıcıya anlaşılır metne çevirir. */
export function getSetupErrorHint(error: unknown): string {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case "P2021":
        return "Tablo yok (P2021). Şema uygulanmamış. Repoda migration var: sunucuda `npm run db:deploy` veya `npx prisma migrate deploy` çalıştırın. Yeni sürümde `npm start` önce migrate deploy çalıştırır; deploy edip konteyneri yeniden başlatın.";
      case "P1000":
        return "PostgreSQL giriş reddedildi (P1000). DATABASE_URL içindeki kullanıcı adı ve şifreyi kontrol edin.";
      case "P1001":
        return "Sunucuya ulaşılamıyor (P1001). Host/port yanlış olabilir veya uygulama konteynerinden DB’ye erişim kapalı (firewall, yanlış internal hostname).";
      case "P1003":
        return "Veritabanı adı bulunamadı (P1003). DATABASE_URL’deki veritabanı oluşturulmuş mu kontrol edin.";
      default:
        break;
    }
  }

  const message = error instanceof Error ? error.message : String(error);
  const name = error instanceof Error ? error.name : "";

  if (
    name === "PrismaClientInitializationError" ||
    /Can't reach database|ECONNREFUSED|P1001/i.test(message)
  ) {
    return "Bağlantı kurulamıyor. DATABASE_URL’i kontrol edin; çoğu bulut Postgres için URL sonuna `?sslmode=require` gerekir. host.docker.internal production’da çalışmaz.";
  }

  if (/relation .* does not exist|table .* does not exist|no such table/i.test(message)) {
    return "Tablolar oluşturulmamış. Repoda migration var: `npm run db:deploy` veya `npx prisma migrate deploy`. Sadece boş/yerel deneme için `npm run db:push` (ön onarım script’i ile) kullanın.";
  }

  if (/certificate|SSL|TLS|self.?signed|sslmode/i.test(message)) {
    return "SSL/TLS sorunu. DATABASE_URL sonuna `?sslmode=require` ekleyin veya sağlayıcınızın önerdiği bağlantı parametrelerini kullanın.";
  }

  return "Ayrıntı sunucu günlüğünde. Sırayla deneyin: 1) `npx prisma migrate deploy` (veya `npm run db:deploy`) 2) DATABASE_URL + SSL 3) uygulama ile DB’nin aynı ağda olduğundan emin olun.";
}
