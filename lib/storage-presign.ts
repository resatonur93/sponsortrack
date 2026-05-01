import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const REGION = process.env.S3_REGION?.trim();
const BUCKET = process.env.S3_BUCKET?.trim();
const ACCESS_KEY_ID = process.env.S3_ACCESS_KEY_ID?.trim();
const SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY?.trim();
const PUBLIC_BASE_URL = process.env.S3_PUBLIC_BASE_URL?.trim();

function s3Client(): S3Client {
  if (!REGION || !BUCKET || !ACCESS_KEY_ID || !SECRET_ACCESS_KEY) {
    throw new Error("S3 is not configured");
  }
  return new S3Client({
    region: REGION,
    credentials: {
      accessKeyId: ACCESS_KEY_ID,
      secretAccessKey: SECRET_ACCESS_KEY,
    },
  });
}

function normalizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export function buildObjectKey(input: {
  tenantId: string;
  workerId: string;
  folder: string;
  fileName: string;
}): string {
  const safeName = normalizeFileName(input.fileName);
  return `tenants/${input.tenantId}/workers/${input.workerId}/${input.folder}/${Date.now()}-${safeName}`;
}

export function objectUrl(objectKey: string): string {
  if (!BUCKET || !REGION) throw new Error("S3 is not configured");
  if (PUBLIC_BASE_URL) return `${PUBLIC_BASE_URL.replace(/\/$/, "")}/${objectKey}`;
  return `https://${BUCKET}.s3.${REGION}.amazonaws.com/${objectKey}`;
}

export async function createPutUrl(input: {
  objectKey: string;
  contentType: string;
}): Promise<string> {
  if (!BUCKET) throw new Error("S3 is not configured");
  const client = s3Client();
  const cmd = new PutObjectCommand({
    Bucket: BUCKET,
    Key: input.objectKey,
    ContentType: input.contentType,
  });
  return getSignedUrl(client, cmd, { expiresIn: 900 });
}
