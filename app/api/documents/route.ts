import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, withTenant } from "@/lib/api-context";
import { prisma, prismaBase } from "@/lib/prisma";
import { processDocumentExpiryRemindersForDocumentId } from "@/lib/document-expiry-email-notify";
import { documentUploadSchema } from "@/lib/schemas";
import { logger } from "@/lib/logger";
import { DocumentVaultFolder } from "@prisma/client";

export const dynamic = "force-dynamic";

function addYears(d: Date, years: number): Date {
  const x = new Date(d);
  x.setFullYear(x.getFullYear() + years);
  return x;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const workerId = req.nextUrl.searchParams.get("workerId");
    if (!workerId) {
      return NextResponse.json(
        { error: "workerId query required" },
        { status: 400 }
      );
    }

    return await withTenant(user, req, async () => {
      const docs = await prisma.document.findMany({
        where: { workerId, isDeleted: false },
        orderBy: { uploadDate: "desc" },
      });
      return NextResponse.json({ data: docs });
    });
  } catch (error) {
    logger.error("GET /api/documents failed", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body: unknown = await req.json();
    const parsed = documentUploadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const d = parsed.data;

    return await withTenant(user, req, async () => {
      let version = 1;
      let replacesId: string | undefined;
      if (d.replacesDocumentId) {
        const parent = await prisma.document.findFirst({
          where: {
            id: d.replacesDocumentId,
            workerId: d.workerId,
          },
        });
        if (parent) {
          version = parent.version + 1;
          replacesId = parent.id;
        }
      }

      const expiry = d.expiryDate ? new Date(d.expiryDate) : null;
      const retentionUntil = expiry
        ? addYears(expiry, 1)
        : addYears(new Date(), 1);

      const meta =
        d.metadata && typeof d.metadata === "object"
          ? (d.metadata as object)
          : undefined;

      const doc = await prisma.document.create({
        data: {
          workerId: d.workerId,
          tenantId: user.tenantId,
          documentType: d.documentType,
          vaultFolder: d.vaultFolder ?? DocumentVaultFolder.OTHER,
          fileName: d.fileName,
          fileUrl: d.fileUrl,
          fileData: d.fileData ?? undefined,
          metadata: meta ?? undefined,
          version,
          replacesDocumentId: replacesId,
          expiryDate: expiry ?? undefined,
          retentionUntil,
          uploadedBy: user.id,
          complianceEventId: d.complianceEventId ?? undefined,
        },
      });
      void processDocumentExpiryRemindersForDocumentId(prismaBase, doc.id).catch((err) =>
        logger.error("document expiry reminders after upload failed", err, {
          documentId: doc.id,
        })
      );
      return NextResponse.json({ data: doc }, { status: 201 });
    });
  } catch (error) {
    logger.error("POST /api/documents failed", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
