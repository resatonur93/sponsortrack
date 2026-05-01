import { isS3Configured } from "@/lib/storage-presign";
import { isSupabaseStorageConfigured } from "@/lib/supabase-storage";

export function isFileStorageConfigured(): boolean {
  return isSupabaseStorageConfigured() || isS3Configured();
}
