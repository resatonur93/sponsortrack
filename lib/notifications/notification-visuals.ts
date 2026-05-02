import type { NotificationType } from "@prisma/client";

/** Badge + accent colours for notification type chips (tailwind utility strings). */
export function notificationTypeBadgeClass(type: NotificationType): string {
  if (/VISA_EXPIRING/i.test(type)) {
    return "border-rose-300/70 bg-gradient-to-r from-rose-50 to-white text-rose-950 shadow-sm ring-1 ring-rose-200/70";
  }
  if (/SPONSORSHIP_ENDING|RIGHT_TO_WORK_RECHECK/i.test(type)) {
    return "border-amber-300/70 bg-gradient-to-r from-amber-50 to-white text-amber-950 shadow-sm ring-1 ring-amber-200/80";
  }
  if (type === "DOCUMENT_EXPIRING" || type === "WORKER_MISSING_DOCUMENTS") {
    return "border-violet-300/70 bg-gradient-to-r from-violet-50 to-white text-violet-950 shadow-sm ring-1 ring-violet-200/70";
  }
  if (type === "SALARY_DISCREPANCY" || type === "SALARY_REDUCTION") {
    return "border-emerald-300/70 bg-gradient-to-r from-emerald-50 to-white text-emerald-950 shadow-sm ring-1 ring-emerald-200/70";
  }
  if (/NO_SHOW|ABSENCE/i.test(type) || type === "UNPAID_OR_REDUCED_PAY_ABSENCE") {
    return "border-sky-300/70 bg-gradient-to-r from-sky-50 to-white text-sky-950 shadow-sm ring-1 ring-sky-200/70";
  }
  if (/ORGANISATION|MERGER|INSOLVENCY|CHARITY|KEY_PERSONNEL|ADDRESS_CONTACT/i.test(type)) {
    return "border-slate-300/80 bg-gradient-to-r from-slate-50 to-white text-slate-900 shadow-sm ring-1 ring-slate-200/80";
  }
  return "border-brand-navy/20 bg-gradient-to-r from-brand-navy/[0.06] to-white text-brand-navy shadow-sm ring-1 ring-brand-navy/15";
}
