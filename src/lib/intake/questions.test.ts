import { describe, expect, it } from "vitest";
import { CATALOG } from "@/lib/intake/catalog.fixture";
import { buildFollowUp } from "@/lib/intake/questions";

describe("buildFollowUp", () => {
  it("đánh số từng câu hỏi theo thứ tự và chào đúng tên", () => {
    const text = buildFollowUp({ name: "Lê Thị Bình", missing: ["environment", "reason"], catalog: CATALOG });
    expect(text).toContain("Chào Lê Thị Bình,");
    expect(text).toContain("1. Anh/chị cần quyền trên môi trường Production hay UAT?");
    expect(text).toContain("2. Anh/chị vui lòng cho biết lý do công việc cần quyền này?");
  });

  it("câu hỏi hệ thống liệt kê danh mục lấy từ Jira", () => {
    const text = buildFollowUp({ name: "An", missing: ["system"], catalog: CATALOG });
    expect(text).toContain("ERP: Xem, Kế toán viên, Phê duyệt thanh toán, Quản trị");
    expect(text).toContain("Hệ thống đối soát: Xem, Chuyên viên đối soát, Quản trị");
  });

  it("có câu riêng khi ngày kết thúc trước ngày bắt đầu và nhắc không gửi mật khẩu", () => {
    const text = buildFollowUp({ name: "An", missing: ["dates_order"], catalog: CATALOG });
    expect(text).toContain("Ngày kết thúc đang trước ngày bắt đầu");
    expect(text).toContain("không gửi mật khẩu");
  });
});
