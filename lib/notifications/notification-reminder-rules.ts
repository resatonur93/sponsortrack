import type {
  DocumentExpiryReminderKind,
  NotificationComplianceAnchorDomain,
} from "@prisma/client";
import type { NotificationConfig } from "@prisma/client";
import { addDays } from "@/lib/dates";

export type ReminderRuleSlice = {
  d60: { enabled: boolean; days: number };
  d30: { enabled: boolean; days: number };
  d7: { enabled: boolean; days: number };
  lastDay: { enabled: boolean };
  afterExpired: { enabled: boolean };
};

type ConfigPick = Pick<
  NotificationConfig,
  | "sendAfterExpired"
  | "visaRemind60Enabled"
  | "visaRemind60Days"
  | "visaRemind30Enabled"
  | "visaRemind30Days"
  | "visaRemind7Enabled"
  | "visaRemind7Days"
  | "visaRemindLastDayEnabled"
  | "sponsorshipRemind60Enabled"
  | "sponsorshipRemind60Days"
  | "sponsorshipRemind30Enabled"
  | "sponsorshipRemind30Days"
  | "sponsorshipRemind7Enabled"
  | "sponsorshipRemind7Days"
  | "sponsorshipRemindLastDayEnabled"
  | "rtwRemind60Enabled"
  | "rtwRemind60Days"
  | "rtwRemind30Enabled"
  | "rtwRemind30Days"
  | "rtwRemind7Enabled"
  | "rtwRemind7Days"
  | "rtwRemindLastDayEnabled"
  | "documentRemind60Enabled"
  | "documentRemind60Days"
  | "documentRemind30Enabled"
  | "documentRemind30Days"
  | "documentRemind7Enabled"
  | "documentRemind7Days"
  | "documentRemindLastDayEnabled"
>;

export function reminderKindMatchesConfiguredOffset(
  kind: DocumentExpiryReminderKind,
  daysFromTodayToAnchor: number,
  rules: ReminderRuleSlice
): boolean {
  switch (kind) {
    case "BEFORE_60":
      return rules.d60.enabled && daysFromTodayToAnchor === rules.d60.days;
    case "BEFORE_30":
      return rules.d30.enabled && daysFromTodayToAnchor === rules.d30.days;
    case "BEFORE_7":
      return rules.d7.enabled && daysFromTodayToAnchor === rules.d7.days;
    case "EXPIRY_DAY":
      return rules.lastDay.enabled && daysFromTodayToAnchor === 0;
    case "AFTER_EXPIRED":
      return rules.afterExpired.enabled && daysFromTodayToAnchor < 0;
    default:
      return false;
  }
}

/** Hatırlatıcı sırasında (cron / olay tetiklemesi değil) gün takvimine göre süzme. */
export function isReminderKindEnabledForTier(
  kind: DocumentExpiryReminderKind,
  rules: ReminderRuleSlice
): boolean {
  switch (kind) {
    case "BEFORE_60":
      return rules.d60.enabled;
    case "BEFORE_30":
      return rules.d30.enabled;
    case "BEFORE_7":
      return rules.d7.enabled;
    case "EXPIRY_DAY":
      return rules.lastDay.enabled;
    case "AFTER_EXPIRED":
      return rules.afterExpired.enabled;
    default:
      return false;
  }
}

export function anchorDomainReminderRules(
  domain: NotificationComplianceAnchorDomain,
  c: ConfigPick
): ReminderRuleSlice {
  const afterExpired = { enabled: c.sendAfterExpired };
  switch (domain) {
    case "VISA_EXPIRY":
    case "COS_EXPIRY":
      return {
        d60: { enabled: c.visaRemind60Enabled, days: c.visaRemind60Days },
        d30: { enabled: c.visaRemind30Enabled, days: c.visaRemind30Days },
        d7: { enabled: c.visaRemind7Enabled, days: c.visaRemind7Days },
        lastDay: { enabled: c.visaRemindLastDayEnabled },
        afterExpired,
      };
    case "SPONSORSHIP_END":
      return {
        d60: {
          enabled: c.sponsorshipRemind60Enabled,
          days: c.sponsorshipRemind60Days,
        },
        d30: {
          enabled: c.sponsorshipRemind30Enabled,
          days: c.sponsorshipRemind30Days,
        },
        d7: {
          enabled: c.sponsorshipRemind7Enabled,
          days: c.sponsorshipRemind7Days,
        },
        lastDay: { enabled: c.sponsorshipRemindLastDayEnabled },
        afterExpired,
      };
    case "RIGHT_TO_WORK_RECHECK":
      return {
        d60: { enabled: c.rtwRemind60Enabled, days: c.rtwRemind60Days },
        d30: { enabled: c.rtwRemind30Enabled, days: c.rtwRemind30Days },
        d7: { enabled: c.rtwRemind7Enabled, days: c.rtwRemind7Days },
        lastDay: { enabled: c.rtwRemindLastDayEnabled },
        afterExpired,
      };
  }
}

export function documentReminderRules(c: ConfigPick): ReminderRuleSlice {
  return {
    d60: { enabled: c.documentRemind60Enabled, days: c.documentRemind60Days },
    d30: { enabled: c.documentRemind30Enabled, days: c.documentRemind30Days },
    d7: { enabled: c.documentRemind7Enabled, days: c.documentRemind7Days },
    lastDay: { enabled: c.documentRemindLastDayEnabled },
    afterExpired: { enabled: c.sendAfterExpired },
  };
}

/** Belge cron: tüm kiracıların etkin gün ofsetlerinin birleşimi + varsayılan 60/30/7 (yapılandırması olmayan kiracılar için). */
export function collectDocumentExpiryScanUtcDays(
  todayStartUtc: Date,
  configs: readonly ConfigPick[]
): Date[] {
  const offsets = new Set<number>([60, 30, 7]);
  for (const c of configs) {
    if (c.documentRemind60Enabled) offsets.add(c.documentRemind60Days);
    if (c.documentRemind30Enabled) offsets.add(c.documentRemind30Days);
    if (c.documentRemind7Enabled) offsets.add(c.documentRemind7Days);
  }
  const dates: Date[] = [];
  Array.from(offsets).forEach((n) => dates.push(addDays(todayStartUtc, n)));
  dates.push(todayStartUtc);
  return dates;
}
