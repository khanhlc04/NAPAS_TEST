import { createClient } from "@supabase/supabase-js";
import { TypeSafeClient } from "@typesafe-ai/sdk";
import { createJevClassifier } from "@/lib/ai/jev";
import type { Env } from "@/lib/env";
import type { IntakeDeps } from "@/lib/intake/run-intake";
import { createJiraClient } from "@/lib/jira/client";
import { createSupabaseStore } from "@/lib/store/extractions";

/** Nối các phần thật: Jira, Jev, Supabase. Chỉ gọi khi có request. */
export function createDeps(env: Env): IntakeDeps {
  // Giới hạn thời gian để cả request nằm trong 30 giây: mỗi lần gọi tối đa 8 giây, thử lại 1 lần.
  const jev = new TypeSafeClient({ apiKey: env.TYPESAFE_API_KEY, defaultModel: env.JEV_MODEL, timeout: 8000, retry: { maxRetries: 1 } });
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  return {
    jira: createJiraClient({ baseUrl: env.JIRA_BASE_URL, email: env.JIRA_EMAIL, apiToken: env.JIRA_API_TOKEN }),
    classifier: createJevClassifier(jev, env.JEV_MODEL),
    store: createSupabaseStore(supabase),
    now: () => new Date(),
    timeZone: env.APP_TIMEZONE,
  };
}
