import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getEnv } from "@/lib/env";

let cached: SupabaseClient | undefined;

/** Client Supabase dùng quyền service role trên server để đọc/ghi ai_extractions. */
export function getSupabase(): SupabaseClient {
  const env = getEnv();
  cached ??= createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  return cached;
}
