import { createDeps } from "@/lib/deps";
import { getEnv } from "@/lib/env";
import { handleEmailIntake } from "@/lib/http/email-intake";
import { runIntake } from "@/lib/intake/run-intake";

// Jira Automation gọi và chờ kết quả, nên xử lý xong trong request (tối đa 30 giây).
export const maxDuration = 30;

export async function POST(request: Request) {
  const env = getEnv();
  const deps = createDeps(env);
  return handleEmailIntake(request, { secret: env.HUB_SHARED_SECRET, run: (issueKey) => runIntake(issueKey, deps) });
}
