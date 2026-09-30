import { describe, expect, it } from "vitest";
import { parseEnv } from "@/lib/env";

const valid = {
  JIRA_BASE_URL: "https://demo.atlassian.net/",
  JIRA_EMAIL: "hub@example.com",
  JIRA_API_TOKEN: "token-token-token",
  HUB_SHARED_SECRET: "0123456789abcdef",
  TYPESAFE_API_KEY: "key-key",
  JEV_MODEL: "jev-latest",
  SUPABASE_URL: "https://abc.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "service-role",
};

describe("parseEnv", () => {
  it("đọc đủ biến, bỏ dấu / cuối của địa chỉ Jira và dùng giá trị mặc định", () => {
    const env = parseEnv(valid);
    expect(env.JIRA_BASE_URL).toBe("https://demo.atlassian.net");
    expect(env.JIRA_PROJECT_KEY).toBe("CQ");
    expect(env.APP_TIMEZONE).toBe("Asia/Ho_Chi_Minh");
  });

  it("báo tên biến bị thiếu nhưng không lộ giá trị của biến nào", () => {
    const { JEV_MODEL: _omitted, ...missing } = valid;
    const attempt = () => parseEnv({ ...missing, HUB_SHARED_SECRET: "ngan" });
    expect(attempt).toThrow(/JEV_MODEL/);
    expect(attempt).toThrow(/HUB_SHARED_SECRET/);
    expect(attempt).not.toThrow(/ngan|token-token-token|service-role/);
  });
});
