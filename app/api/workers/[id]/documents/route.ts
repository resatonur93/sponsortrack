import { NextRequest, NextResponse } from "next/server";
import { DocumentFolder } from "@prisma/client";
import { getSessionUser, withTenant } from "@/lib/api-context";
import { prisma } from "@/lib/prisma";
import { documentVaultCreateSchema } from "@/lib/schemas";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

function addYears(d: Date, years: number): Date {
  const x = new Date(d);
  x.setFullYear(x.getFullYear() + years);
  return x;
}

const FOLDER_ORDER: DocumentFolder[] = [
  DocumentFolder.IDENTITY_IMMIGRATION,
  DocumentFolder.RIGHT_TO_WORK,
  DocumentFolder.COS_APPLICATION,
  DocumentFolder.EMPLOYMENT_CONTRACT,
  DocumentFolder.PAYROLL_SALARY,
  DocumentFolder.ABSENCE_LEAVE,
  DocumentFolder.ADDRESS_CONTACT,
  DocumentFolder.ROLE_DUTIES,
  DocumentFolder.RECRUITMENT_VACANCY,
  DocumentFolder.REPORTING_SUBMISSIONS,
  DocumentFolder.COMPLIANCE_VISIT_PACK,
];

type RouteParams = { params: { id: string } };

export async function GET(
  req: NextRequest,
  context: RouteParams
): Promise<NextResponse> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const workerId = context.params.id;

    return await withTenant(user, req, async () => {
      const worker = await prisma.worker.findFirst({
        where: { id: workerId },
        select: { id: true },
      });
      if (!worker) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      const rows = await prisma.documentVault.findMany({
        where: { workerId, isDeleted: false },
        orderBy: [{ folder: "asc" }, { createdAt: "desc" }],
      });

      const grouped: Record<string, typeof rows> = {};
      for (const f of FOLDER_ORDER) {
        grouped[f] = [];
      }
      for (const row of rows) {
        if (!grouped[row.folder]) grouped[row.folder] = [];
        grouped[row.folder].push(row);
      }

      return NextResponse.json({
        data: {
          folders: FOLDER_ORDER,
          grouped,
        },
      });
    });
  } catch (error) {
    logger.error("GET /api/workers/[id]/documents failed", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  context: RouteParams
): Promise<NextResponse> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const workerId = context.params.id;
    const body: unknown = await req.json();
    const parsed = documentVaultCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const d = parsed.data;

    return await withTenant(user, req, async () => {
      const worker = await prisma.worker.findFirst({
        where: { id: workerId },
        select: { id: true },
      });
      if (!worker) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      const expiry = d.expiryDate ? new Date(d.expiryDate) : null;
      const retentionUntil = expiry
        ? addYears(expiry, 1)
        : addYears(new Date(), 1);

      const doc = await prisma.documentVault.create({
        data: {
          workerId,
          tenantId: user.tenantId,
          folder: d.folder,
          fileName: d.fileName,
          fileUrl: d.fileUrl,
          fileData: d.fileData ?? undefined,
          uploadedBy: user.id,
          expiryDate: expiry ?? undefined,
          retentionUntil,
        },
      });
      return NextResponse.json({ data: doc }, { status: 201 });
    });
  } catch (error) {
    logger.error("POST /api/workers/[id]/documents failed", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
