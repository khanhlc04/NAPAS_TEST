import { describe, expect, it } from "vitest";
import { findIncidentCode } from "@/lib/intake/incident";

describe("findIncidentCode", () => {
  it("nhận các dạng viết thường gặp và chuẩn hóa", () => {
    expect(findIncidentCode("Sự cố INC-2026-0042 đang ảnh hưởng")).toBe("INC-2026-0042");
    expect(findIncidentCode("mã inc0012345")).toBe("INC-0012345");
    expect(findIncidentCode("theo sc 4521")).toBe("SC-4521");
  });

  it("không nhầm mã yêu cầu Jira hay từ khác", () => {
    expect(findIncidentCode("Xem CQ-123 và INCOME 2026")).toBeNull();
    expect(findIncidentCode("inc-12")).toBeNull();
    expect(findIncidentCode("Không có mã nào")).toBeNull();
  });
});
