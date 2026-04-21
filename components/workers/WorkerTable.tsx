"use client";

import Link from "next/link";
import type { EmploymentStatus, Worker } from "@prisma/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/contexts/LanguageContext";

const statusVariant = (s: EmploymentStatus): "default" | "success" | "warning" | "danger" | "outline" => {
  switch (s) {
    case "ACTIVE":
      return "success";
    case "PENDING_START":
      return "warning";
    case "SUSPENDED":
      return "outline";
    case "TERMINATED":
      return "danger";
    default:
      return "default";
  }
};

export function WorkerTable(props: { workers: Worker[] }): JSX.Element {
  const { t, locale } = useTranslation();
  const localeTag = locale === "tr" ? "tr-TR" : "en-GB";
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("common.name")}</TableHead>
          <TableHead>{t("common.email")}</TableHead>
          <TableHead>{t("workers.visaExpiry")}</TableHead>
          <TableHead>{t("common.status")}</TableHead>
          <TableHead className="text-right">{t("common.action")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {props.workers.map((w) => (
          <TableRow key={w.id}>
            <TableCell className="font-medium">
              {w.firstName} {w.lastName}
            </TableCell>
            <TableCell>{w.email}</TableCell>
            <TableCell>
              {w.visaExpiryDate
                ? new Date(w.visaExpiryDate).toLocaleDateString(localeTag)
                : "—"}
            </TableCell>
            <TableCell>
              <Badge variant={statusVariant(w.employmentStatus)}>
                {w.employmentStatus}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              <Link
                href={`/workers/${w.id}`}
                className="text-sm font-medium text-brand-navy hover:underline"
              >
                {t("workerTable.detail")}
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
