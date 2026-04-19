import { Prisma } from "@prisma/client";

/** İlk kurulum sayfasında Prisma hatasını kullanıcıya anlaşılır metne çevirir. */
export function getSetupErrorHint(error: unknown): string {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case "P2021":
        return "Tablo yok (P2021). Bu veritabanında Prisma şeması uygulanmamış. Sunucuda proje kökünde bir kez `npx prisma db push` çalıştırın veya deploy “Release/Post-deploy command” olarak ekleyin.";
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
    return "Tablolar oluşturulmamış. Bir kez `npx prisma db push` çalıştırın (şema bu veritabanına hiç uygulanmamış olabilir).";
  }

  if (/certificate|SSL|TLS|self.?signed|sslmode/i.test(message)) {
    return "SSL/TLS sorunu. DATABASE_URL sonuna `?sslmode=require` ekleyin veya sağlayıcınızın önerdiği bağlantı parametrelerini kullanın.";
  }

  return "Ayrıntı sunucu günlüğünde. Sırayla deneyin: 1) `npx prisma db push` 2) DATABASE_URL + SSL 3) uygulama ile DB’nin aynı ağda olduğundan emin olun.";
}
