"use client";

import Link from "next/link";
import type { Role } from "@prisma/client";
import { useTranslation } from "@/contexts/LanguageContext";
import type { LicenceOverview, RecordKeepingSummary } from "@/lib/dashboard-response";

function tEnum(
  translate: (key: string, fallback?: string) => string,
  key: string,
  fallback: string
): string {
  const v = translate(key, fallback);
  return v === key ? fallback : v;
}

function CardShell(props: {
  title: string;
  href?: string;
  children: React.ReactNode;
}): JSX.Element {
  const body = (
    <div className="h-full rounded-xl border border-slate-100 bg-white p-4 shadow-card transition-colors hover:bg-brand-surface/40">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-400">
        {props.title}
      </h3>
      {props.children}
    </div>
  );
  return props.href ? (
    <Link href={props.href} className="block h-full">
      {body}
    </Link>
  ) : (
    body
  );
}

export function RecordKeepingCards(
  props: RecordKeepingSummary & { licence: LicenceOverview | null }
): JSX.Element {
  const { t, locale } = useTranslation();
  const localeTag = locale === "tr" ? "tr-TR" : "en-GB";
  const roleCount = (role: Role): number =>
    props.keyPersonnel.filter((p) => p.role === role).length;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <CardShell title={t("dashboard.licence.title")}>
        <p className="font-semibold text-brand-navy">{props.licence?.companyName}</p>
        <p className="text-xs text-slate-500">{props.licence?.licenceNumber}</p>
        <div className="mt-2 space-y-0.5 text-xs text-slate-600">
          <p>
            {t("dashboard.licence.type")}: {props.licence?.licenceType ?? t("dashboard.licence.notSet")}
          </p>
          <p>
            {t("dashboard.licence.rating")}: {props.licence?.licenceRating ?? t("dashboard.licence.notSet")}
          </p>
          <p>
            {t("dashboard.licence.expiry")}:{" "}
            {props.licence?.licenceExpiryDate
              ? new Date(props.licence.licenceExpiryDate).toLocaleDateString(localeTag)
              : t("dashboard.licence.notSet")}
          </p>
        </div>
      </CardShell>

      <CardShell title={t("dashboard.keyPersonnel.title")}>
        <ul className="space-y-1 text-sm text-slate-700">
          <li>
            {tEnum(t, "role.AUTHORISING_OFFICER", "Authorising Officer")}:{" "}
            <span className="font-semibold text-brand-navy">
              {roleCount("AUTHORISING_OFFICER")}
            </span>
          </li>
          <li>
            {tEnum(t, "role.LEVEL_1_USER", "Level 1")}:{" "}
            <span className="font-semibold text-brand-navy">{roleCount("LEVEL_1_USER")}</span>
          </li>
          <li>
            {tEnum(t, "role.LEVEL_2_USER", "Level 2")}:{" "}
            <span className="font-semibold text-brand-navy">{roleCount("LEVEL_2_USER")}</span>
          </li>
        </ul>
      </CardShell>

      <CardShell title={t("dashboard.recruitment.title")} href="/vacancies">
        <p className="text-sm text-slate-700">
          <span className="font-semibold text-brand-navy">{props.recruitment.draft}</span>{" "}
          {tEnum(t, "vacancies.status.DRAFT", "draft")} ·{" "}
          <span className="font-semibold text-brand-navy">{props.recruitment.underReview}</span>{" "}
          {tEnum(t, "vacancies.status.UNDER_REVIEW", "under review")} ·{" "}
          <span className="font-semibold text-brand-navy">{props.recruitment.approved}</span>{" "}
          {tEnum(t, "vacancies.status.APPROVED", "approved")}
        </p>
      </CardShell>

      <CardShell title={t("dashboard.rtw.title")}>
        <p className="text-sm text-slate-700">
          <span className="font-semibold text-red-600">{props.rtwSummary.overdue}</span>{" "}
          {t("dashboard.rtw.overdue")} ·{" "}
          <span className="font-semibold text-amber-600">{props.rtwSummary.dueSoon}</span>{" "}
          {t("dashboard.rtw.dueSoon")}
        </p>
      </CardShell>

      <CardShell title={t("dashboard.payrollAttendance.title")} href="/audit">
        <p className="text-sm text-slate-700">
          <span className="font-semibold text-brand-navy">
            {props.payrollAttendance.salaryAnomalies}
          </span>{" "}
          {t("dashboard.payrollAttendance.salaryAnomalies")}
        </p>
        <p className="text-sm text-slate-700">
          <span className="font-semibold text-brand-navy">
            {props.payrollAttendance.openAbsenceIssues}
          </span>{" "}
          {t("dashboard.payrollAttendance.openAbsenceIssues")}
        </p>
      </CardShell>

      <CardShell title={t("dashboard.smsReporting.title")} href="/events">
        <p className="text-sm text-slate-700">
          {props.smsReporting.draft} {tEnum(t, "sms.status.draft", "draft")} ·{" "}
          {props.smsReporting.approved} {tEnum(t, "sms.status.approved", "approved")} ·{" "}
          {props.smsReporting.sent} {tEnum(t, "sms.status.sent", "sent")}
        </p>
      </CardShell>

      <CardShell title={t("dashboard.auditHistory.title")} href="/audit">
        {props.auditHistory.recentCount > 0 ? (
          <>
            <p className="text-sm text-slate-700">
              <span className="font-semibold text-brand-navy">
                {props.auditHistory.recentCount}
              </span>{" "}
              {t("dashboard.auditHistory.recentCount")}
            </p>
            {props.auditHistory.lastEntryAt ? (
              <p className="text-xs text-slate-500">
                {t("dashboard.auditHistory.lastEntry")}:{" "}
                {new Date(props.auditHistory.lastEntryAt).toLocaleString(localeTag)}
              </p>
            ) : null}
          </>
        ) : (
          <p className="text-sm text-slate-500">{t("dashboard.auditHistory.noEntries")}</p>
        )}
      </CardShell>
    </div>
  );
}
