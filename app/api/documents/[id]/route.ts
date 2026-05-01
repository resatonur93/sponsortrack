import { NextRequest, NextResponse } from "next/server";
import { type Prisma } from "@prisma/client";
import { getSessionUser, withTenant } from "@/lib/api-context";
import { prisma, prismaBase } from "@/lib/prisma";
import { documentVaultUpdateSchema } from "@/lib/schemas";
import { logger } from "@/lib/logger";
import { processDocumentExpiryRemindersForDocumentId } from "@/lib/document-expiry-email-notify";
import {
  softUnlinkComplianceDocumentForVault,
  syncVaultToDocument,
} from "@/lib/sync-vault-to-document";

export const dynamic = "force-dynamic";

function addYears(d: Date, years: number): Date {
  const x = new Date(d);
  x.setFullYear(x.getFullYear() + years);
  return x;
}

type RouteParams = { params: { id: string } };

type VersionSnapshot = {
  version: number;
  fileName: string;
  fileUrl: string;
  mimeType?: string | null;
  sizeBytes?: number | null;
  fileHash?: string | null;
  uploadedBy: string;
  createdAt: string;
  expiryDate?: string | null;
};

function parsePreviousVersions(raw: unknown): VersionSnapshot[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (x): x is VersionSnapshot =>
      typeof x === "object" &&
      x !== null &&
      "version" in x &&
      typeof (x as VersionSnapshot).version === "number"
  );
}

export async function PUT(
  req: NextRequest,
  context: RouteParams
): Promise<NextResponse> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = context.params;
    const body: unknown = await req.json();
    const parsed = documentVaultUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const d = parsed.data;

    return await withTenant(user, req, async () => {
      const existing = await prisma.documentVault.findFirst({
        where: { id, isDeleted: false },
      });
      if (!existing) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      const prev: VersionSnapshot = {
        version: existing.version,
        fileName: existing.fileName,
        fileUrl: existing.fileUrl,
        mimeType: existing.mimeType,
        sizeBytes: existing.sizeBytes,
        fileHash: existing.fileHash,
        uploadedBy: existing.uploadedBy,
        createdAt: existing.createdAt.toISOString(),
        expiryDate: existing.expiryDate?.toISOString() ?? null,
      };
      const history = [...parsePreviousVersions(existing.previousVersions), prev];

      const data: Prisma.DocumentVaultUpdateInput = {
        version: existing.version + 1,
        fileName: d.fileName,
        fileUrl: d.fileUrl,
        mimeType: d.mimeType,
        sizeBytes: d.sizeBytes,
        fileHash: d.fileHash,
        previousVersions: history as Prisma.InputJsonValue,
        uploadedBy: user.id,
      };

      if (d.expiryDate !== undefined) {
        data.expiryDate =
          d.expiryDate && d.expiryDate !== "" ? new Date(d.expiryDate) : null;
      }
      if (d.retentionUntil !== undefined) {
        data.retentionUntil =
          d.retentionUntil && d.retentionUntil !== ""
            ? new Date(d.retentionUntil)
            : null;
      } else if (d.expiryDate !== undefined) {
        const exp = data.expiryDate as Date | null | undefined;
        if (exp) {
          data.retentionUntil = addYears(exp, 1);
        } else {
          data.retentionUntil = addYears(new Date(), 1);
        }
      }

      const { updated, syncMeta } = await prismaBase.$transaction(async (tx) => {
        const row = await tx.documentVault.update({
          where: { id },
          data,
        });
        const s = await syncVaultToDocument(tx, existing.tenantId, existing.workerId, row);
        return { updated: row, syncMeta: s };
      });

      if (syncMeta) {
        void processDocumentExpiryRemindersForDocumentId(prismaBase, syncMeta.documentId).catch(
          (err) =>
            logger.error("document expiry reminders after vault metadata update failed", err, {
              vaultId: id,
              documentId: syncMeta.documentId,
            })
        );
      }

      return NextResponse.json({ data: updated });
    });
  } catch (error) {
    logger.error("PUT /api/documents/[id] failed", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  context: RouteParams
): Promise<NextResponse> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = context.params;

    return await withTenant(user, req, async () => {
      const existing = await prisma.documentVault.findFirst({
        where: { id, isDeleted: false },
      });
      if (!existing) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      await prismaBase.$transaction(async (tx) => {
        await softUnlinkComplianceDocumentForVault(tx, existing.tenantId, id);
        await tx.documentVault.update({
          where: { id },
          data: { isDeleted: true },
        });
      });

      return NextResponse.json({ ok: true });
    });
  } catch (error) {
    logger.error("DELETE /api/documents/[id] failed", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
