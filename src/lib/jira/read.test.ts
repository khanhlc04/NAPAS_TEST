import { describe, expect, it } from "vitest";
import { CATALOG_ALLOWED_VALUES } from "@/lib/intake/catalog.fixture";
import { fakeJira, FIELDS } from "@/lib/jira/fake-jira";
import { createJiraReader } from "@/lib/jira/read";

describe("createJiraReader", () => {
  it("đọc yêu cầu: trạng thái, người báo, đã điền hệ thống chưa, kênh", async () => {
    const { http, calls } = fakeJira({
      "GET /rest/api/2/field": FIELDS,
      "GET /rest/api/2/issue/CQ-7": { fields: {
        summary: "Xin quyền ERP", description: "Em xin quyền", status: { name: "Mới" },
        reporter: { accountId: "acc-1", displayName: "Lê Thị Bình" },
        customfield_10088: { value: "ERP", child: { value: "Xem" } }, customfield_10098: { value: "Email" },
      } },
    });
    expect(await createJiraReader(http).getIssue("CQ-7")).toEqual({
      key: "CQ-7", summary: "Xin quyền ERP", description: "Em xin quyền", status: "Mới",
      reporter: { accountId: "acc-1", displayName: "Lê Thị Bình" }, systemFilled: true, channel: "Email",
    });
    expect(calls.at(-1)?.url).toContain("fields=summary,description,status,reporter,customfield_10088,customfield_10098");
  });

  it("yêu cầu chưa điền hệ thống và chưa có mô tả", async () => {
    const { http } = fakeJira({
      "GET /rest/api/2/field": FIELDS,
      "GET /rest/api/2/issue/CQ-8": { fields: { summary: "s", status: { name: "Mới" }, reporter: { accountId: "a", displayName: "An" }, customfield_10088: null } },
    });
    expect(await createJiraReader(http).getIssue("CQ-8")).toMatchObject({ description: null, systemFilled: false, channel: null });
  });

  it("chỉ lấy bình luận công khai của chính người yêu cầu, theo thứ tự thời gian", async () => {
    const { http, calls } = fakeJira({ "GET /rest/servicedeskapi/request/CQ-7/comment": { values: [
      { body: "Trả lời sau", author: { accountId: "acc-1" }, created: { epochMillis: 200 } },
      { body: "Câu hỏi của Hub", author: { accountId: "hub" }, created: { epochMillis: 100 } },
      { body: "Trả lời trước", author: { accountId: "acc-1" }, created: { epochMillis: 150 } },
    ] } });
    expect(await createJiraReader(http).getRequesterComments("CQ-7", "acc-1")).toEqual(["Trả lời trước", "Trả lời sau"]);
    expect(calls[0].url).toContain("public=true&internal=false");
  });

  it("đọc danh mục từ editmeta của chính yêu cầu", async () => {
    const { http } = fakeJira({
      "GET /rest/api/2/field": FIELDS,
      "GET /rest/api/2/issue/CQ-7/editmeta": { fields: { customfield_10088: { allowedValues: CATALOG_ALLOWED_VALUES } } },
    });
    expect(await createJiraReader(http).getCatalog("CQ-7")).toHaveLength(14);
  });

  it("trường không nằm trên màn hình sửa thì danh mục rỗng, để phía gọi hỏi lại hoặc báo", async () => {
    const { http } = fakeJira({ "GET /rest/api/2/field": FIELDS, "GET /rest/api/2/issue/CQ-7/editmeta": { fields: {} } });
    expect(await createJiraReader(http).getCatalog("CQ-7")).toEqual([]);
  });
});
