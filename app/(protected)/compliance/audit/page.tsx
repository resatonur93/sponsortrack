"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AuditPackDownload } from "@/components/audit/AuditPackDownload";
import { AnomalyList } from "@/components/audit/AnomalyList";
import type { AnomalyFinding } from "@/lib/anomalies";
import { useTranslation } from "@/contexts/LanguageContext";

type Pack = {
  workers: { id: string; firstName: string; lastName: string; email: string }[];
  notifications: { id: string; eventType: string; status: string }[];
  documents: { id: string; documentType: string; fileName: string }[];
  salaryChanges: unknown[];
  absences: unknown[];
  changeLogs: unknown[];
  anomalies: AnomalyFinding[];
};

function tEnum(
  translate: (key: string, fallback?: string) => string,
  key: string,
  fallback: string
): string {
  const v = translate(key, fallback);
  return v === key ? fallback : v;
}

export default function ComplianceAuditPage(): JSX.Element {
  const { t } = useTranslation();
  const [pack, setPack] = useState<Pack | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/compliance/audit-pack", {
        credentials: "include",
      });
      if (!res.ok) {
        setErr(t("complianceAuditPage.loadFailed"));
        return;
      }
      const json = (await res.json()) as { data: Pack };
      setPack(json.data);
    })();
  }, [t]);

  if (err) {
    return <p className="text-red-600">{err}</p>;
  }
  if (!pack) {
    return <p className="text-slate-600">{t("common.loading")}</p>;
  }

  return (
    <div className="space-y-8">
      <div>
        <Link href="/compliance" className="text-sm text-brand-navy hover:underline">
          {t("complianceAuditPage.backLink")}
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-brand-navy">
          {t("complianceAuditPage.title")}
        </h1>
        <p className="text-slate-600">{t("complianceAuditPage.subtitle")}</p>
      </div>

      <AuditPackDownload />

      <section>
        <h2 className="mb-2 text-lg font-semibold text-brand-navy">
          {t("complianceAuditPage.anomaliesTitle")}
        </h2>
        <AnomalyList items={pack.anomalies} />
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-brand-navy">
          {t("complianceAuditPage.workersPreviewTitle")}
        </h2>
        <div className="rounded-md border border-slate-200 bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("complianceAuditPage.colName")}</TableHead>
                <TableHead>{t("complianceAuditPage.colEmail")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pack.workers.slice(0, 25).map((w) => (
                <TableRow key={w.id}>
                  <TableCell>
                    {w.firstName} {w.lastName}
                  </TableCell>
                  <TableCell className="text-xs">{w.email}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-brand-navy">
          {t("complianceAuditPage.notificationsPreviewTitle")}
        </h2>
        <div className="rounded-md border border-slate-200 bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("complianceAuditPage.colType")}</TableHead>
                <TableHead>{t("complianceAuditPage.colStatus")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pack.notifications.slice(0, 25).map((n) => (
                <TableRow key={n.id}>
                  <TableCell className="text-xs">
                    {tEnum(t, `notifications.type.${n.eventType}`, n.eventType)}
                  </TableCell>
                  <TableCell>
                    {tEnum(t, `notifications.status.${n.status}`, n.status)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
