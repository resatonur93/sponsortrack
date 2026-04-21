import { NextRequest, NextResponse } from "next/server";
import { jsPDF } from "jspdf";
import { getSessionUser, withTenant } from "@/lib/api-context";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  buildAuditWorkerWhere,
  parseAuditWorkerFilters,
} from "@/lib/audit-worker-filters";
import { evaluateMissingDocuments } from "@/lib/required-documents";
import { buildAuditDashboardPayload } from "@/lib/audit-dashboard-data";

export const dynamic = "force-dynamic";

function escapeCsvCell(v: string): string {
  if (/[",\n\r]/.test(v)) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const format = (req.nextUrl.searchParams.get("format") ?? "csv")
      .toLowerCase()
      .trim();
    if (format !== "csv" && format !== "pdf") {
      return NextResponse.json(
        { error: "Invalid format; use csv or pdf" },
        { status: 400 }
      );
    }

    return await withTenant(user, req, async () => {
      const filters = parseAuditWorkerFilters(req.nextUrl.searchParams);
      const where = await buildAuditWorkerWhere(prisma, filters);

      const [workers, snapshot] = await Promise.all([
        prisma.worker.findMany({
          where,
          orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
          take: 2000,
          include: {
            documents: { where: { isDeleted: false } },
          },
        }),
        buildAuditDashboardPayload(prisma, user.tenantId),
      ]);

      const now = new Date();

      if (format === "csv") {
        const header = [
          "id",
          "lastName",
          "firstName",
          "email",
          "cosReference",
          "employmentStatus",
          "complianceRiskLevel",
          "visaExpiryDate",
          "missingDocumentCount",
        ];
        const lines = [header.join(",")];
        for (const w of workers) {
          const miss = evaluateMissingDocuments(w, w.documents, now).filter(
            (m) => m.reason === "missing" || m.reason === "expired"
          );
          lines.push(
            [
              w.id,
              w.lastName,
              w.firstName,
              w.email,
              w.cosReference,
              w.employmentStatus,
              w.complianceRiskLevel,
              w.visaExpiryDate?.toISOString() ?? "",
              String(miss.length),
            ]
              .map((c) => escapeCsvCell(String(c)))
              .join(",")
          );
        }
        const bom = "\uFEFF";
        const csv = bom + lines.join("\r\n");
        return new NextResponse(csv, {
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition":
              'attachment; filename="sponsortrack-audit-workers.csv"',
          },
        });
      }

      const doc = new jsPDF({ unit: "mm", format: "a4" });
      let y = 12;
      doc.setFontSize(15);
      doc.text("SponsorTrack — Audit export", 14, y);
      y += 7;
      doc.setFontSize(9);
      doc.text(`Tenant snapshot · ${now.toLocaleString("en-GB")}`, 14, y);
      y += 5;
      doc.text(
        `Workers (non-terminated): ${snapshot.stats.totalSponsoredWorkers} · Active: ${snapshot.stats.activeSponsorships} · Overdue reports: ${snapshot.stats.overdueReports}`,
        14,
        y
      );
      y += 5;
      doc.text(
        `Visas ≤30d: ${snapshot.stats.visasExpiring30d} · Visas ≤90d: ${snapshot.stats.visasExpiring90dWindow} · Missing-doc workers: ${snapshot.stats.missingDocumentsWorkers} · Salary anomalies: ${snapshot.stats.salaryAnomalyRecords}`,
        14,
        y
      );
      y += 8;
      doc.setFontSize(10);
      doc.text("Filtered workers", 14, y);
      y += 6;
      doc.setFontSize(8.5);

      for (const w of workers) {
        if (y > 285) {
          doc.addPage();
          y = 12;
        }
        const miss = evaluateMissingDocuments(w, w.documents, now).filter(
          (m) => m.reason === "missing" || m.reason === "expired"
        );
        const visa = w.visaExpiryDate
          ? w.visaExpiryDate.toLocaleDateString("en-GB")
          : "—";
        const line = `${w.lastName}, ${w.firstName} · ${w.email} · risk ${w.complianceRiskLevel} · visa ${visa} · missing ${miss.length}`;
        const wrapped = doc.splitTextToSize(line, 182);
        doc.text(wrapped, 14, y);
        y += Math.max(5, wrapped.length * 4);
      }

      const buf = doc.output("arraybuffer");
      return new NextResponse(buf, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition":
            'attachment; filename="sponsortrack-audit-workers.pdf"',
        },
      });
    });
  } catch (e) {
    logger.error("GET /api/audit/export failed", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
