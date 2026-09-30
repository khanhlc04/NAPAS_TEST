import { describe, expect, it } from "vitest";
import type { Classifier } from "@/lib/ai/jev";
import { CATALOG } from "@/lib/intake/catalog.fixture";
import { runIntake, type IntakeDeps } from "@/lib/intake/run-intake";
import { makeSignals } from "@/lib/intake/signals.fixture";
import type { JiraPort } from "@/lib/jira/client";
import type { IssueSnapshot } from "@/lib/jira/read";
import { createMemoryStore } from "@/lib/store/memory-store";

const EMAIL = "Em xin quyền Kế toán viên trên ERP, môi trường Production, từ 1/10 đến hết năm để làm quyết toán.";

function setup(options: { issue?: Partial<IssueSnapshot>; comments?: string[]; signals?: ReturnType<typeof makeSignals>; failFill?: boolean } = {}) {
  const calls: string[] = [];
  const jira: JiraPort = {
    async getIssue(key) {
      return {
        key, summary: "Xin quyền ERP", description: EMAIL, status: "Mới",
        reporter: { accountId: "acc-1", displayName: "Lê Thị Bình" }, systemFilled: false, channel: "Email", ...options.issue,
      };
    },
    async getRequesterComments() { return options.comments ?? []; },
    async getCatalog() { return CATALOG; },
    async fillFields(_key, fields) {
      if (options.failFill) throw new Error("Jira 400 PUT");
      calls.push(`fill:${fields.system}/${fields.role}:${fields.startDate}:${fields.endDate}`);
    },
    async addComment(_key, body, isPublic) { calls.push(`${isPublic ? "public" : "internal"}:${body}`); },
    async transition(_key, name) { calls.push(`transition:${name}`); },
  };
  let classifier: Classifier = { async classify() { return options.signals ?? makeSignals(); } };
  const store = createMemoryStore();
  const deps: IntakeDeps = { jira, store, now: () => new Date("2026-09-30T03:00:00Z"), get classifier() { return classifier; } };
  return { deps, calls, store, setClassifier: (next: Classifier) => { classifier = next; } };
}

describe("runIntake", () => {
  it("email đủ thông tin: điền trường, ghi bình luận nội bộ, không hỏi lại", async () => {
    const { deps, calls, store } = setup();
    expect(await runIntake("CQ-7", deps)).toEqual({ outcome: "filled" });
    expect(calls[0]).toBe("fill:ERP/Kế toán viên:2026-10-01:2026-12-31");
    expect(calls[1]).toMatch(/^internal:AI \(Jev jev-test\) đã điền yêu cầu từ email/);
    expect(calls).toHaveLength(2);
    expect(store.rows[0]).toMatchObject({ issueKey: "CQ-7", attempt: 1, outcome: "filled", model: "jev-test", confidence: 0.9 });
  });

  it("thiếu môi trường: hỏi lại công khai rồi chuyển sang Chờ bổ sung", async () => {
    const { deps, calls, store } = setup({ signals: makeSignals({ environment: { choice: "Không nêu", confidence: 0.95 } }) });
    expect(await runIntake("CQ-7", deps)).toEqual({ outcome: "asked" });
    expect(calls[0]).toMatch(/^public:Chào Lê Thị Bình,[\s\S]*Production hay UAT/);
    expect(calls[1]).toBe("transition:Yêu cầu bổ sung");
    expect(store.rows[0]).toMatchObject({ outcome: "asked", missingFields: ["environment"] });
  });

  it("hỏi quá 3 lần thì dừng, để ở Mới cho người xử lý tay", async () => {
    const { deps, calls, store } = setup({ signals: makeSignals({ environment: { choice: "Không nêu", confidence: 0.95 } }) });
    for (let attempt = 0; attempt < 3; attempt++) {
      store.rows.push({ issueKey: "CQ-7", attempt: attempt + 1, inputHash: `h${attempt}`, model: "m", output: null, confidence: null, outcome: "asked", missingFields: [], latencyMs: 1, error: null });
    }
    const result = await runIntake("CQ-7", deps);
    expect(result).toMatchObject({ outcome: "failed", reason: expect.stringContaining("3 lần") });
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatch(/^internal:AI: Cần phân loại tay/);
  });

  it("Jev lỗi: không đụng vào trường, ghi bình luận nội bộ, lưu nhật ký thất bại", async () => {
    const { deps, calls, store, setClassifier } = setup();
    setClassifier({ async classify() { throw new Error("Jev 429"); } });
    expect(await runIntake("CQ-7", deps)).toEqual({ outcome: "failed", reason: "Jev 429" });
    expect(calls).toEqual(["internal:AI: Cần phân loại tay. Lý do: Jev 429"]);
    expect(store.rows[0]).toMatchObject({ outcome: "failed", error: "Jev 429" });
  });

  it("ghi Jira thất bại giữa chừng cũng được ghi nhận là thất bại, không ném lỗi", async () => {
    const { deps, calls } = setup({ failFill: true });
    expect(await runIntake("CQ-7", deps)).toMatchObject({ outcome: "failed", reason: "Jira 400 PUT" });
    expect(calls).toEqual(["internal:AI: Cần phân loại tay. Lý do: Jira 400 PUT"]);
  });

  it("không phải yêu cầu cấp quyền: bình luận nội bộ, để nguyên trường", async () => {
    const { deps, calls } = setup({ signals: makeSignals({ isRequest: 0.05 }) });
    expect(await runIntake("CQ-7", deps)).toEqual({ outcome: "not_request" });
    expect(calls).toHaveLength(1);
    expect(calls[0]).toContain("Không phải yêu cầu cấp quyền");
  });

  it("email có chỉ dẫn đáng ngờ: vẫn xử lý bình thường nhưng cảnh báo người duyệt", async () => {
    const { deps, calls } = setup({ signals: makeSignals({ abnormal: 0.95 }) });
    expect(await runIntake("CQ-7", deps)).toEqual({ outcome: "filled" });
    expect(calls[1]).toContain("Có dấu hiệu bất thường");
  });

  it("cảnh báo cũng được ghi khi phải hỏi lại", async () => {
    const { deps, calls } = setup({ signals: makeSignals({ abnormal: 0.95, environment: { choice: "Không nêu", confidence: 0.9 } }) });
    await runIntake("CQ-7", deps);
    expect(calls[0]).toMatch(/^internal:AI cảnh báo:/);
    expect(calls[1]).toMatch(/^public:/);
  });

  it("bỏ qua yêu cầu không còn ở Mới hoặc đã có Hệ thống / Quyền", async () => {
    expect(await runIntake("CQ-7", setup({ issue: { status: "Chờ Trưởng ĐV duyệt" } }).deps)).toEqual({ outcome: "skipped", reason: "not_new" });
    const filled = setup({ issue: { systemFilled: true } });
    expect(await runIntake("CQ-7", filled.deps)).toEqual({ outcome: "skipped", reason: "already_filled" });
    expect(filled.calls).toHaveLength(0);
  });

  it("gọi lặp cùng nội dung chỉ xử lý một lần", async () => {
    const { deps, calls } = setup({ signals: makeSignals({ environment: { choice: "Không nêu", confidence: 0.95 } }) });
    expect(await runIntake("CQ-7", deps)).toEqual({ outcome: "asked" });
    const before = calls.length;
    expect(await runIntake("CQ-7", deps)).toEqual({ outcome: "skipped", reason: "duplicate" });
    expect(calls).toHaveLength(before);
  });

  it("lần thất bại không chặn lần thử lại với cùng nội dung", async () => {
    const { deps, setClassifier } = setup();
    setClassifier({ async classify() { throw new Error("Jev 500"); } });
    expect(await runIntake("CQ-7", deps)).toMatchObject({ outcome: "failed" });
    setClassifier({ async classify() { return makeSignals(); } });
    expect(await runIntake("CQ-7", deps)).toEqual({ outcome: "filled" });
  });

  it("có trả lời bổ sung của người yêu cầu thì tính là nội dung mới và được xử lý lại", async () => {
    const first = setup({ signals: makeSignals({ environment: { choice: "Không nêu", confidence: 0.95 } }) });
    await runIntake("CQ-7", first.deps);
    const second = setup({ comments: ["Môi trường Production."] });
    second.store.rows.push(...first.store.rows);
    expect(await runIntake("CQ-7", second.deps)).toEqual({ outcome: "filled" });
    expect(second.store.rows.at(-1)).toMatchObject({ attempt: 2, outcome: "filled" });
  });

  it("lỗi đọc Jira ban đầu được ném ra để phía gọi biết", async () => {
    const { deps } = setup();
    deps.jira.getIssue = async () => { throw new Error("Jira 503"); };
    await expect(runIntake("CQ-7", deps)).rejects.toThrow("Jira 503");
  });
});
