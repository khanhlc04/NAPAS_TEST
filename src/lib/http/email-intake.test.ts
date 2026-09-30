import { describe, expect, it } from "vitest";
import { handleEmailIntake } from "@/lib/http/email-intake";

const SECRET = "s3cret-value-1234";
const post = (body: unknown, headers: Record<string, string> = { "x-hub-secret": SECRET }) =>
  new Request("https://hub.test/api/jira/email-intake", { method: "POST", headers, body: typeof body === "string" ? body : JSON.stringify(body) });

function context(run = async () => ({ outcome: "filled" as const })) {
  const seen: string[] = [];
  return { seen, context: { secret: SECRET, run: async (key: string) => { seen.push(key); return run(); } } };
}

describe("handleEmailIntake", () => {
  it("401 và không chạy gì khi sai hoặc thiếu secret", async () => {
    const { seen, context: ctx } = context();
    expect((await handleEmailIntake(post({ issueKey: "CQ-1" }, {}), ctx)).status).toBe(401);
    expect((await handleEmailIntake(post({ issueKey: "CQ-1" }, { "x-hub-secret": "sai" }), ctx)).status).toBe(401);
    expect(seen).toHaveLength(0);
  });

  it("400 khi thân request không phải JSON hoặc mã yêu cầu sai dạng", async () => {
    const { seen, context: ctx } = context();
    for (const body of ["không phải json", {}, { issueKey: "../etc/passwd" }, { issueKey: "cq-1" }, { issueKey: 5 }]) {
      expect((await handleEmailIntake(post(body), ctx)).status).toBe(400);
    }
    expect(seen).toHaveLength(0);
  });

  it("200 kèm kết quả xử lý", async () => {
    const { seen, context: ctx } = context();
    const response = await handleEmailIntake(post({ issueKey: "CQ-12" }), ctx);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ outcome: "filled" });
    expect(seen).toEqual(["CQ-12"]);
  });

  it("502 kèm lý do khi không đọc được Jira", async () => {
    const { context: ctx } = context(async () => { throw new Error("Jira 503 GET /rest/api/2/issue/CQ-1"); });
    const response = await handleEmailIntake(post({ issueKey: "CQ-1" }), ctx);
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ outcome: "failed", error: "Jira 503 GET /rest/api/2/issue/CQ-1" });
  });
});
