import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { DocumentFolder } from "@prisma/client";
import { getSessionUser, withTenant } from "@/lib/api-context";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { isFileStorageConfigured } from "@/lib/file-storage";
import {
  buildObjectKey,
  createPutUrl,
  getS3MissingEnvVars,
  isS3Configured,
  objectUrl,
} from "@/lib/storage-presign";
import {
  createSupabaseSignedUploadUrl,
  getSupabaseStorageMissingEnvVars,
  isSupabaseStorageConfigured,
  supabasePublicObjectUrl,
} from "@/lib/supabase-storage";

type PresignUploadTransport = "supabase-formdata" | "s3-binary";

type PresignResponseData = {
  uploadUrl: string;
  fileUrl: string;
  objectKey: string;
  uploadTransport: PresignUploadTransport;
};

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

    if (!isFileStorageConfigured()) {
      const missingSupabase = getSupabaseStorageMissingEnvVars();
      const missingS3 = getS3MissingEnvVars();
      logger.warn("POST /api/storage/presign rejected: incomplete storage env", {
        missingSupabase,
        missingS3,
      });
      return NextResponse.json(
        {
          error:
            "File storage is not configured. For Supabase set SUPABASE_URL (same project URL — fixes Docker/runtime), SUPABASE_SERVICE_ROLE_KEY (service_role JWT), SUPABASE_STORAGE_BUCKET — or NEXT_PUBLIC_SUPABASE_URL if present at npm run build. Publishable keys are not used—or set all S3_* vars.",
          code: "STORAGE_NOT_CONFIGURED",
          missingSupabaseEnv: missingSupabase,
          missingS3Env: missingS3,
        },
        { status: 503 }
      );
    }

    return await withTenant(user, req, async () => {
      const worker = await prisma.worker.findFirst({
        where: { id: d.workerId, tenantId: user.tenantId },
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

      let data: PresignResponseData;

      if (isSupabaseStorageConfigured()) {
        const { signedUrl } = await createSupabaseSignedUploadUrl(objectKey);
        data = {
          uploadUrl: signedUrl,
          fileUrl: supabasePublicObjectUrl(objectKey),
          objectKey,
          uploadTransport: "supabase-formdata",
        };
      } else if (isS3Configured()) {
        const uploadUrl = await createPutUrl({
          objectKey,
          contentType: d.mimeType,
        });
        const fileUrl = objectUrl(objectKey);
        data = {
          uploadUrl,
          fileUrl,
          objectKey,
          uploadTransport: "s3-binary",
        };
      } else {
        return NextResponse.json(
          { error: "File storage backend misconfigured.", code: "STORAGE_NOT_CONFIGURED" },
          { status: 503 }
        );
      }

      return NextResponse.json({ data });
    });
  } catch (error) {
    logger.error("POST /api/storage/presign failed", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
