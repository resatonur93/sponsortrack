import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { DocumentFolder } from "@prisma/client";
import { getSessionUser, withTenant } from "@/lib/api-context";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  buildObjectKey,
  createPutUrl,
  isS3Configured,
  objectUrl,
} from "@/lib/storage-presign";

export const dynamic = "force-dynamic";

const presignSchema = z.object({
  workerId: z.string().min(1),
  folder: z.nativeEnum(DocumentFolder),
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().positive().max(20 * 1024 * 1024),
  fileHash: z.string().min(32),
});

const allowedMimeTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body: unknown = await req.json();
    const parsed = presignSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const d = parsed.data;
    if (!allowedMimeTypes.has(d.mimeType)) {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
    }

    if (!isS3Configured()) {
      logger.warn(
        "POST /api/storage/presign rejected: set S3_REGION, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY"
      );
      return NextResponse.json(
        {
          error:
            "File storage is not configured. Set S3_REGION, S3_BUCKET, S3_ACCESS_KEY_ID, and S3_SECRET_ACCESS_KEY on the server.",
          code: "STORAGE_NOT_CONFIGURED",
        },
        { status: 503 }
      );
    }

    return await withTenant(user, req, async () => {
      const worker = await prisma.worker.findFirst({
        where: { id: d.workerId },
        select: { id: true },
      });
      if (!worker) {
        return NextResponse.json({ error: "Worker not found" }, { status: 404 });
      }

      const objectKey = buildObjectKey({
        tenantId: user.tenantId,
        workerId: d.workerId,
        folder: d.folder,
        fileName: d.fileName,
      });
      const uploadUrl = await createPutUrl({
        objectKey,
        contentType: d.mimeType,
      });
      const fileUrl = objectUrl(objectKey);
      return NextResponse.json({ data: { uploadUrl, fileUrl, objectKey } });
    });
  } catch (error) {
    logger.error("POST /api/storage/presign failed", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
