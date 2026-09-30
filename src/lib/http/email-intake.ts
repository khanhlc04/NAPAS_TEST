import { z } from "zod";
import { isAuthorized } from "@/lib/auth";
import type { IntakeResult } from "@/lib/intake/run-intake";

const bodySchema = z.object({ issueKey: z.string().regex(/^[A-Z][A-Z0-9_]*-\d+$/) });

export interface EmailIntakeContext {
  secret: string;
  run: (issueKey: string) => Promise<IntakeResult>;
}

/**
 * Xử lý POST /api/jira/email-intake (spec 04 mục 4).
 * 401 nếu sai secret, 400 nếu thân request sai, 200 kèm kết quả, 502 nếu không đọc được Jira.
 */
export async function handleEmailIntake(request: Request, context: EmailIntakeContext): Promise<Response> {
  if (!isAuthorized(request, context.secret)) return Response.json({ error: "unauthorized" }, { status: 401 });

  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return Response.json({ error: "bad_request" }, { status: 400 });

  try {
    return Response.json(await context.run(body.data.issueKey));
  } catch (error) {
    console.error("email-intake lỗi", error);
    return Response.json({ outcome: "failed", error: error instanceof Error ? error.message : String(error) }, { status: 502 });
  }
}
