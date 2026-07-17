import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, withTenant } from "@/lib/api-context";
import { prisma, prismaBase } from "@/lib/prisma";
import { processDocumentExpiryRemindersForDocumentId } from "@/lib/notifications/email/document-expiry-email-notify";
import { documentUploadSchema } from "@/lib/schemas";
import { logger } from "@/lib/logger";
import { DocumentFolder } from "@prisma/client";

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
      const expiry = d.expiryDate ? new Date(d.expiryDate) : null;
      const retentionUntil = expiry
        ? addYears(expiry, 1)
        : addYears(new Date(), 1);

      const meta =
        d.metadata && typeof d.metadata === "object"
          ? (d.metadata as object)
          : undefined;

      const active = await prisma.document.findFirst({
        where: {
          tenantId: user.tenantId,
          workerId: d.workerId,
          documentType: d.documentType,
          isDeleted: false,
        },
      });

      let version = 1;
      if (active) {
        version = active.version + 1;
      } else if (d.replacesDocumentId) {
        const parent = await prisma.document.findFirst({
          where: {
            id: d.replacesDocumentId,
            workerId: d.workerId,
            tenantId: user.tenantId,
          },
        });
        if (parent) version = parent.version + 1;
      }

      const payload = {
        vaultFolder: d.vaultFolder ?? DocumentFolder.OTHER,
        fileName: d.fileName,
        fileUrl: d.fileUrl,
        mimeType: d.mimeType,
        sizeBytes: d.sizeBytes,
        fileHash: d.fileHash,
        metadata: meta ?? undefined,
        version,
        replacesDocumentId: null as string | null,
        vaultFileId: null as null,
        expiryDate: expiry ?? undefined,
        retentionUntil,
        uploadedBy: user.id,
        complianceEventId: d.complianceEventId ?? undefined,
        uploadDate: new Date(),
      };

      const resetVerification =
        !!active &&
        active.fileHash !== d.fileHash &&
        active.complianceRecordStatus === "VERIFIED";

      let doc;
      if (active) {
        doc = await prisma.document.update({
          where: { id: active.id },
          data: {
            ...payload,
            ...(resetVerification
              ? {
                  verifiedAt: null,
                  verifiedByUserId: null,
                  verificationNote: null,
                  complianceRecordStatus: "UPLOADED" as const,
                }
              : {}),
          },
        });
      } else {
        doc = await prisma.document.create({
          data: {
            workerId: d.workerId,
            tenantId: user.tenantId,
            documentType: d.documentType,
            complianceRecordStatus: "UPLOADED",
            ...payload,
          },
        });
      }

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
