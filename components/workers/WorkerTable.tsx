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
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>İsim</TableHead>
          <TableHead>E-posta</TableHead>
          <TableHead>Vize bitiş</TableHead>
          <TableHead>Durum</TableHead>
          <TableHead className="text-right">Aksiyon</TableHead>
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
                ? new Date(w.visaExpiryDate).toLocaleDateString("en-GB")
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
                Detay
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
