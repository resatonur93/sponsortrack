import type { DocumentFolder } from "@prisma/client";

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function sha256(file: File): Promise<string> {
  const ab = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", ab);
  return toHex(digest);
}

/** Presign + upload a file to the tenant's configured storage backend (Supabase or S3), returning the stored object's metadata. */
export async function uploadWithPresign(input: {
  workerId: string;
  folder: DocumentFolder;
  file: File;
  t: (key: string, fallback?: string) => string;
}): Promise<{
  fileName: string;
  fileUrl: string;
  mimeType: string;
  sizeBytes: number;
  fileHash: string;
}> {
  const mimeType = input.file.type || "application/octet-stream";
  const sizeBytes = input.file.size;
  const fileHash = await sha256(input.file);
  const presign = await fetch("/api/storage/presign", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      workerId: input.workerId,
      folder: input.folder,
      fileName: input.file.name,
      mimeType,
      sizeBytes,
      fileHash,
    }),
  });
  const presignJson = (await presign.json().catch(() => ({}))) as {
    data?: {
      uploadUrl: string;
      fileUrl: string;
      /** Supabase Storage: signed URL bekler multipart FormData ile PUT (@supabase/storage-js ile uyumlu). */
      uploadTransport?: "supabase-formdata" | "s3-binary";
    };
    error?: string;
  };
  if (!presign.ok || !presignJson.data) {
    throw new Error(presignJson.error ?? input.t("documentVault.presignFailed"));
  }

  const transport = presignJson.data.uploadTransport ?? "s3-binary";
  let put: Response;
  if (transport === "supabase-formdata") {
    const fd = new FormData();
    fd.append("cacheControl", "3600");
    fd.append("", input.file);
    put = await fetch(presignJson.data.uploadUrl, { method: "PUT", body: fd });
  } else {
    put = await fetch(presignJson.data.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": mimeType },
      body: input.file,
    });
  }
  if (!put.ok) {
    const detail = await put.text().catch(() => "");
    const base = input.t("documentVault.storageUploadFailed");
    throw new Error(detail ? `${base}: ${detail.slice(0, 200)}` : base);
  }
  return {
    fileName: input.file.name,
    fileUrl: presignJson.data.fileUrl,
    mimeType,
    sizeBytes,
    fileHash,
  };
}
