import { describe, expect, it } from "vitest";
import { fakeJira, FIELDS } from "@/lib/jira/fake-jira";
import { JiraError } from "@/lib/jira/http";

describe("createJiraHttp", () => {
  it("gửi Basic auth bằng email và API token", async () => {
    const { http, calls } = fakeJira({ "GET /rest/api/2/ping": {} });
    await http.call("/rest/api/2/ping");
    expect(calls[0].headers.Authorization).toBe(`Basic ${Buffer.from("hub@example.com:tok").toString("base64")}`);
  });

  it("tra id trường theo tên một lần rồi nhớ lại, kể cả khi hai lần tra chạy cùng lúc", async () => {
    const { http, calls } = fakeJira({ "GET /rest/api/2/field": FIELDS });
    const [system, channel] = await Promise.all([http.fieldId("Hệ thống / Quyền"), http.fieldId("Kênh tiếp nhận")]);
    expect([system, channel]).toEqual(["customfield_10088", "customfield_10098"]);
    await http.fieldId("Môi trường");
    expect(calls.filter((call) => call.url === "/rest/api/2/field")).toHaveLength(1);
  });

  it("không nhớ lỗi: lần tra đầu thất bại thì lần sau gọi lại được", async () => {
    let attempt = 0;
    const { http } = fakeJira({
      "GET /rest/api/2/field": () => (++attempt === 1 ? new Response("boom", { status: 500 }) : new Response(JSON.stringify(FIELDS))),
    });
    await expect(http.fieldId("Môi trường")).rejects.toMatchObject({ status: 500 });
    await expect(http.fieldId("Môi trường")).resolves.toBe("customfield_10089");
  });

  it("ném JiraError kèm mã trạng thái khi Jira trả lỗi", async () => {
    const { http } = fakeJira({ "GET /rest/api/2/field": () => new Response("forbidden", { status: 403 }) });
    await expect(http.fieldId("Môi trường")).rejects.toBeInstanceOf(JiraError);
    await expect(http.fieldId("Môi trường")).rejects.toMatchObject({ name: "JiraError", status: 403 });
  });

  it("báo rõ tên khi thiếu trường Jira", async () => {
    const { http } = fakeJira({ "GET /rest/api/2/field": [{ id: "summary", name: "Summary" }] });
    await expect(http.fieldId("Hệ thống / Quyền")).rejects.toThrow(/Hệ thống \/ Quyền/);
  });
});
