import { describe, expect, it } from "vitest";
import { isAuthorized } from "@/lib/auth";

const request = (headers: Record<string, string> = {}) => new Request("https://hub.test/api", { method: "POST", headers });

describe("isAuthorized", () => {
  it("chấp nhận đúng secret", () => {
    expect(isAuthorized(request({ "x-hub-secret": "s3cret-value-1234" }), "s3cret-value-1234")).toBe(true);
  });

  it("từ chối secret sai, sai độ dài hoặc thiếu header", () => {
    expect(isAuthorized(request({ "x-hub-secret": "s3cret-value-9999" }), "s3cret-value-1234")).toBe(false);
    expect(isAuthorized(request({ "x-hub-secret": "ngan" }), "s3cret-value-1234")).toBe(false);
    expect(isAuthorized(request(), "s3cret-value-1234")).toBe(false);
  });
});
