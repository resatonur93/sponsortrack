import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** Sunucuda her istekte okunur — modül yüklemede gömülü kalmaz. */
function supabaseProjectUrl(): string | undefined {
  const u =
    process.env.SUPABASE_URL?.trim() || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  return u || undefined;
}

function supabaseServiceRole(): string | undefined {
  return process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || undefined;
}

function supabaseBucket(): string | undefined {
  return process.env.SUPABASE_STORAGE_BUCKET?.trim() || undefined;
}

export function isSupabaseStorageConfigured(): boolean {
  return Boolean(
    supabaseProjectUrl() && supabaseServiceRole() && supabaseBucket()
  );
}

/**
 * Docker/Nixpacks: `NEXT_PUBLIC_*` sıkça `npm run build` sırasında gömülür; build ortamında
 * yoksa üretimde boş kalabilir. Bunun için aynı URL’yi **SUPABASE_URL** ile çalışma anında da verin.
 */
export function getSupabaseStorageMissingEnvVars(): string[] {
  const missing: string[] = [];
  if (!supabaseProjectUrl()) {
    missing.push(
      "SUPABASE_URL (recommended — runtime) or NEXT_PUBLIC_SUPABASE_URL (must exist at build if used alone)"
    );
  }
  if (!supabaseServiceRole()) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseBucket()) missing.push("SUPABASE_STORAGE_BUCKET");
  return missing;
}

function adminClient(): SupabaseClient {
  const url = supabaseProjectUrl();
  const key = supabaseServiceRole();
  const bucket = supabaseBucket();
  if (!url || !key || !bucket) {
    throw new Error("Supabase storage is not configured");
  }
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export async function createSupabaseSignedUploadUrl(
  objectKey: string
): Promise<{ signedUrl: string }> {
  const sb = adminClient();
  const bucketId = supabaseBucket()!;
  const { data, error } = await sb.storage
    .from(bucketId)
    .createSignedUploadUrl(objectKey);
  if (error) throw error;
  if (!data?.signedUrl) throw new Error("Signed upload URL not returned");
  return { signedUrl: data.signedUrl };
}

/** Genel URL; bucket Supabase panelde public olmalı (doğrudan `<a href>` için). */
export function supabasePublicObjectUrl(objectKey: string): string {
  const sb = adminClient();
  const bucketId = supabaseBucket()!;
  const { data } = sb.storage.from(bucketId).getPublicUrl(objectKey);
  return data.publicUrl;
}
