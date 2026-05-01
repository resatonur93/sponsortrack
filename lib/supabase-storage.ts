import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const PROJECT_URL =
  process.env.SUPABASE_URL?.trim() ||
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const BUCKET = process.env.SUPABASE_STORAGE_BUCKET?.trim();

export function isSupabaseStorageConfigured(): boolean {
  return Boolean(PROJECT_URL && SERVICE_ROLE && BUCKET);
}

/** Teşhis: bucket / service_role / URL hangisi eksik (env adları — secret değerleri dönmez). */
export function getSupabaseStorageMissingEnvVars(): string[] {
  const missing: string[] = [];
  if (!process.env.SUPABASE_URL?.trim() && !process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()) {
    missing.push("NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL");
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    missing.push("SUPABASE_SERVICE_ROLE_KEY");
  }
  if (!process.env.SUPABASE_STORAGE_BUCKET?.trim()) {
    missing.push("SUPABASE_STORAGE_BUCKET");
  }
  return missing;
}

function adminClient(): SupabaseClient {
  if (!isSupabaseStorageConfigured()) {
    throw new Error("Supabase storage is not configured");
  }
  return createClient(PROJECT_URL!, SERVICE_ROLE!, {
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
  const { data, error } = await sb.storage
    .from(BUCKET!)
    .createSignedUploadUrl(objectKey);
  if (error) throw error;
  if (!data?.signedUrl) throw new Error("Signed upload URL not returned");
  return { signedUrl: data.signedUrl };
}

/** Genel URL; bucket Supabase panelde public olmalı (doğrudan `<a href>` için). */
export function supabasePublicObjectUrl(objectKey: string): string {
  const sb = adminClient();
  const { data } = sb.storage.from(BUCKET!).getPublicUrl(objectKey);
  return data.publicUrl;
}
