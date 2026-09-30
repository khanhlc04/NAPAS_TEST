import { z } from "zod";

const schema = z.object({
  JIRA_BASE_URL: z.string().url().transform((value) => value.replace(/\/+$/, "")),
  JIRA_EMAIL: z.string().email(),
  JIRA_API_TOKEN: z.string().min(10),
  JIRA_PROJECT_KEY: z.string().min(1).default("CQ"),
  HUB_SHARED_SECRET: z.string().min(16),
  TYPESAFE_API_KEY: z.string().min(1),
  JEV_MODEL: z.string().min(1),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  APP_TIMEZONE: z.string().min(1).default("Asia/Ho_Chi_Minh"),
});

export type Env = z.infer<typeof schema>;

/** Báo tên biến bị thiếu hoặc sai, tuyệt đối không in giá trị (có thể là secret). */
export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = schema.safeParse(source);
  if (!result.success) {
    const names = [...new Set(result.error.issues.map((issue) => String(issue.path[0])))];
    throw new Error(`Thiếu hoặc sai biến môi trường: ${names.join(", ")}`);
  }
  return result.data;
}

let cached: Env | undefined;

/** Đọc lười, chỉ khi có request. Không đọc lúc import để `next build` không cần biến môi trường. */
export function getEnv(): Env {
  cached ??= parseEnv(process.env);
  return cached;
}
