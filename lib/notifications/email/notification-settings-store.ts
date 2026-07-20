import type { NotificationConfig, PrismaClient } from "@prisma/client";
import { canonicalTemplateCatalogKeys, defaultPartialForTemplateKey } from "./default-templates";

/** Veritabanı satırı yoksa cron / gönderim tarafında kullanılan yapı — kalıcı `id` yoktur. */
const STATIC_DEFAULT_ROWS: Omit<
  NotificationConfig,
  "id" | "tenantId" | "createdAt" | "updatedAt"
> = {
  emailEnabled: true,
  ccRecipients: null,
  bccRecipients: null,
  sendAfterExpired: true,
  visaRemind60Enabled: true,
  visaRemind60Days: 60,
  visaRemind30Enabled: true,
  visaRemind30Days: 30,
  visaRemind7Enabled: true,
  visaRemind7Days: 7,
  visaRemindLastDayEnabled: true,
  sponsorshipRemind60Enabled: true,
  sponsorshipRemind60Days: 60,
  sponsorshipRemind30Enabled: true,
  sponsorshipRemind30Days: 30,
  sponsorshipRemind7Enabled: true,
  sponsorshipRemind7Days: 7,
  sponsorshipRemindLastDayEnabled: false,
  rtwRemind60Enabled: true,
  rtwRemind60Days: 60,
  rtwRemind30Enabled: true,
  rtwRemind30Days: 30,
  rtwRemind7Enabled: true,
  rtwRemind7Days: 7,
  rtwRemindLastDayEnabled: false,
  documentRemind60Enabled: true,
  documentRemind60Days: 60,
  documentRemind30Enabled: true,
  documentRemind30Days: 30,
  documentRemind7Enabled: true,
  documentRemind7Days: 7,
  documentRemindLastDayEnabled: true,
  externalAdviserName: null,
  externalAdviserEmail: null,
};

export function coerceEffectiveNotificationConfig(
  tenantId: string,
  row: NotificationConfig | null
): NotificationConfig {
  if (row) return row;
  return {
    id: "__inline__",
    tenantId,
    createdAt: new Date(0),
    updatedAt: new Date(0),
    ...STATIC_DEFAULT_ROWS,
  };
}

export async function getOrCreateNotificationConfig(
  db: PrismaClient,
  tenantId: string
): Promise<NotificationConfig> {
  const existing = await db.notificationConfig.findUnique({
    where: { tenantId },
  });
  if (existing) return existing;
  return db.notificationConfig.create({ data: { tenantId } });
}

export async function ensureEmailTemplatesForTenant(
  db: PrismaClient,
  tenantId: string
): Promise<void> {
  const keys = canonicalTemplateCatalogKeys();
  const existing = await db.emailTemplate.findMany({
    where: { tenantId },
    select: { templateKey: true },
  });
  const have = new Set(existing.map((e) => e.templateKey));
  for (const templateKey of keys) {
    if (have.has(templateKey)) continue;
    const defs = defaultPartialForTemplateKey(templateKey);
    await db.emailTemplate.create({
      data: {
        tenantId,
        templateKey,
        ...defs,
      },
    });
    have.add(templateKey);
  }
}

export async function loadNotificationConfigForTenant(
  db: PrismaClient,
  tenantId: string
): Promise<NotificationConfig> {
  const row = await db.notificationConfig.findUnique({
    where: { tenantId },
  });
  return coerceEffectiveNotificationConfig(tenantId, row);
}
