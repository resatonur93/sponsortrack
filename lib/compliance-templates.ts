import type { NotificationType } from "@prisma/client";

const EVIDENCE: Partial<Record<NotificationType, string>> = {
  SALARY_REDUCTION:
    "Son maaş bordrosu, sözleşme değişikliği (varsa), çalışanın onayı veya bildirimi.",
  WORK_LOCATION_CHANGE:
    "Yeni çalışma adresi kanıtı, iç onay e-postası, harita / risk değerlendirmesi (gerekirse).",
  SPONSORSHIP_ENDED:
    "İşten çıkış tarihi, iletişim denemeleri kaydı, CoS ile ilgili güncel bilgi.",
  NO_SHOW:
    "İşe başlama tarihi, iletişim girişimleri, onboarding kayıtları.",
  UNAUTHORISED_ABSENCE:
    "Devamsızlık tarihleri, yönetici notları, çalışana ulaşma denemeleri.",
  CHANGE_OF_ROLE_OR_DUTIES:
    "Güncel iş tanımı, SOC uyumu gerekçesi, iç onay.",
  DOCUMENT_EXPIRING:
    "Yenilenmiş belgenin kopyası (pasaport / BRP / eVisa vb.).",
  WORKER_MISSING_DOCUMENTS:
    "Eksik belgenin tamamlanmış kopyası ve vault’a yüklenmiş sürüm.",
  SALARY_DISCREPANCY:
    "Bordro çıktısı, beklenen ve gerçekleşen maaş karşılaştırması, düzeltme notu.",
  RIGHT_TO_WORK_RECHECK_60_DAYS:
    "Son Right to Work check kaydı, bir sonraki kontrol planı ve kanıt dosyası.",
  RIGHT_TO_WORK_RECHECK_30_DAYS:
    "Son Right to Work check kaydı, bir sonraki kontrol planı ve kanıt dosyası.",
  RIGHT_TO_WORK_RECHECK_7_DAYS:
    "Son Right to Work check kaydı, bir sonraki kontrol planı ve kanıt dosyası.",
  SPONSORSHIP_ENDING_60_DAYS:
    "Sponsorluk bitiş tarihi kaydı, uzatma/çıkış planı ve iç onay notu.",
  SPONSORSHIP_ENDING_30_DAYS:
    "Sponsorluk bitiş tarihi kaydı, uzatma/çıkış planı ve iç onay notu.",
  SPONSORSHIP_ENDING_7_DAYS:
    "Sponsorluk bitiş tarihi kaydı, uzatma/çıkış planı ve iç onay notu.",
};

export function getEvidenceHint(type: NotificationType): string {
  return (
    EVIDENCE[type] ??
    "İlgili olayı doğrulayan belgeler ve iç onay notları (SMS’e eklenecek kanıt listesi)."
  );
}

export function getSmsDraft(
  type: NotificationType,
  ctx: { workerName: string; cosRef?: string; extra?: string }
): string {
  const who = ctx.workerName;
  const extra = ctx.extra ? ` ${ctx.extra}` : "";
  const cos = ctx.cosRef ? ` CoS ref: ${ctx.cosRef}.` : "";

  const lines: Partial<Record<NotificationType, string>> = {
    SALARY_REDUCTION: `[SMS taslak] Sponsorlu çalışan ${who} için maaş düşüşü tespit edildi.${cos}${extra} Raporlama süresi içinde SMS üzerinden bildirim yapılacaktır. Kanıt: son bordro ve güncel sözleşme.`,
    WORK_LOCATION_CHANGE: `[SMS taslak] ${who} için normal çalışma yeri değişikliği.${cos}${extra} Güncel adres ve gerekli iç onaylar eklenecektir.`,
    SPONSORSHIP_ENDED: `[SMS taslak] ${who} için sponsorluk sonlandırma.${cos}${extra}`,
    NO_SHOW: `[SMS taslak] ${who} için 28 gün içinde işe başlamama (no show) değerlendirmesi.${cos}`,
    UNAUTHORISED_ABSENCE: `[SMS taslak] ${who} için izinsiz devamsızlık (10 ardışık iş günü kuralı kapsamında değerlendirme).${cos}${extra}`,
    VISA_EXPIRING_90_DAYS: `[SMS taslak] ${who} vize süresi yaklaşıyor (90 gün, eski kayıt).${cos}`,
    VISA_EXPIRING_60_DAYS: `[SMS taslak] ${who} vize süresi yaklaşıyor (60 gün).${cos}`,
    VISA_EXPIRING_30_DAYS: `[SMS taslak] ${who} vize süresi yaklaşıyor (30 gün).${cos}`,
    VISA_EXPIRING_7_DAYS: `[SMS taslak] ${who} vize süresi kritik (7 gün).${cos}`,
    RIGHT_TO_WORK_RECHECK_60_DAYS: `[SMS taslak] ${who} için Right to Work yeniden kontrol tarihi 60 gün içinde.${cos}`,
    RIGHT_TO_WORK_RECHECK_30_DAYS: `[SMS taslak] ${who} için Right to Work yeniden kontrol tarihi 30 gün içinde.${cos}`,
    RIGHT_TO_WORK_RECHECK_7_DAYS: `[SMS taslak] ${who} için Right to Work yeniden kontrol tarihi kritik (7 gün).${cos}`,
    SPONSORSHIP_ENDING_60_DAYS: `[SMS taslak] ${who} için sponsorluk bitiş tarihi 60 gün içinde.${cos}`,
    SPONSORSHIP_ENDING_30_DAYS: `[SMS taslak] ${who} için sponsorluk bitiş tarihi 30 gün içinde.${cos}`,
    SPONSORSHIP_ENDING_7_DAYS: `[SMS taslak] ${who} için sponsorluk bitiş tarihi kritik (7 gün).${cos}`,
    DOCUMENT_EXPIRING: `[SMS taslak] ${who} için süresi dolmakta olan belge.${cos}`,
    WORKER_MISSING_DOCUMENTS: `[SMS taslak] ${who} için zorunlu belge eksik.${cos} Lütfen vault’u güncelleyin.`,
    SALARY_DISCREPANCY: `[SMS taslak] ${who} bordro uyumsuzluğu.${cos} Kontrol ve düzeltme gerekir.`,
  };

  return (
    lines[type] ??
    `[SMS taslak] ${who} — olay tipi: ${type}.${cos}${extra} Lütfen kanıt listesini ve rapor son tarihini kontrol edin.`
  );
}

export function defaultReportDeadlineDays(_type: NotificationType): number {
  return 14;
}
