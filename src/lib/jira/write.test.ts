import { describe, expect, it } from "vitest";
import type { FilledFields } from "@/lib/intake/decide";
import { fakeJira, FIELDS } from "@/lib/jira/fake-jira";
import { createJiraWriter } from "@/lib/jira/write";

const FILLED: FilledFields = {
  system: "ERP", role: "Kế toán viên", environment: "Production", requestKind: "Cấp mới", priority: "Cao",
  startDate: "2026-10-01", endDate: "2026-12-31", reason: "Làm quyết toán", incidentCode: null,
};

describe("createJiraWriter", () => {
  it("điền trường: trường 2 tầng, ngày, ưu tiên; bỏ mã sự cố khi không có", async () => {
    const { http, calls } = fakeJira({ "GET /rest/api/2/field": FIELDS, "PUT /rest/api/2/issue/CQ-7": null });
    const writer = createJiraWriter(http);
    await writer.fillFields("CQ-7", FILLED);
    expect(calls.at(-1)?.body).toEqual({ fields: {
      customfield_10088: { value: "ERP", child: { value: "Kế toán viên" } },
      customfield_10089: { value: "Production" }, customfield_10090: { value: "Cấp mới" },
      customfield_10087: "2026-10-01", customfield_10091: "2026-12-31",
      customfield_10093: "Làm quyết toán", priority: { name: "Cao" },
    } });
    await writer.fillFields("CQ-7", { ...FILLED, incidentCode: "INC-2026-0042" });
    expect((calls.at(-1)?.body as { fields: Record<string, unknown> }).fields.customfield_10092).toBe("INC-2026-0042");
  });

  it("bình luận công khai hoặc nội bộ qua API của Jira Service Management", async () => {
    const { http, calls } = fakeJira({ "POST /rest/servicedeskapi/request/CQ-7/comment": {} });
    const writer = createJiraWriter(http);
    await writer.addComment("CQ-7", "Chào An", true);
    await writer.addComment("CQ-7", "Ghi chú AI", false);
    expect(calls.map((call) => call.body)).toEqual([{ body: "Chào An", public: true }, { body: "Ghi chú AI", public: false }]);
  });

  it("chuyển trạng thái bằng cách tra id transition theo tên", async () => {
    const { http, calls } = fakeJira({
      "GET /rest/api/2/issue/CQ-7/transitions": { transitions: [{ id: "11", name: "Gửi duyệt" }, { id: "13", name: "Yêu cầu bổ sung" }] },
      "POST /rest/api/3/issue/CQ-7/transitions": null,
    });
    const writer = createJiraWriter(http);
    await writer.transition("CQ-7", "Yêu cầu bổ sung");
    expect(calls.at(-1)).toMatchObject({ method: "POST", body: { transition: { id: "13" } } });
    await expect(writer.transition("CQ-7", "Không có")).rejects.toThrow(/không có transition/);
  });
});
