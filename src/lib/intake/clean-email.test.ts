import { describe, expect, it } from "vitest";
import { cleanEmail } from "@/lib/intake/clean-email";

describe("cleanEmail", () => {
  it("giữ nguyên nội dung không có gì để bỏ", () => {
    expect(cleanEmail("Em xin quyền ERP.\nCảm ơn anh chị.")).toBe("Em xin quyền ERP.\nCảm ơn anh chị.");
  });

  it("bỏ các dòng trích dẫn bắt đầu bằng >", () => {
    expect(cleanEmail("Đồng ý.\n> Anh cần quyền gì?\n> Trả lời giúp em")).toBe("Đồng ý.");
  });

  it("cắt tại dòng tiêu đề thư cũ tiếng Anh", () => {
    const raw = "Em xin quyền ERP.\n\nOn Mon, Oct 5, 2026 at 9:00 AM An <an@x.com> wrote:\nThư cũ ở đây";
    expect(cleanEmail(raw)).toBe("Em xin quyền ERP.");
  });

  it("cắt tại dòng tiêu đề thư cũ tiếng Việt", () => {
    const raw = "Em xin quyền ERP.\nVào Th 2, ngày 5 thg 10, 2026 vào lúc 09:00 An <an@x.com> đã viết:\nThư cũ";
    expect(cleanEmail(raw)).toBe("Em xin quyền ERP.");
  });

  it("cắt cả khi dòng tiêu đề bị ngắt làm đôi", () => {
    const raw = "Em xin quyền ERP.\nVào Th 2, ngày 5 thg 10, 2026 vào lúc 09:00 An <\nan@x.com> đã viết:\nThư cũ";
    expect(cleanEmail(raw)).toBe("Em xin quyền ERP.");
  });

  it("bỏ chữ ký sau lời chào kết thư và sau dấu gạch", () => {
    expect(cleanEmail("Em xin quyền ERP.\n\nTrân trọng,\nBình\nPhòng Tài chính")).toBe("Em xin quyền ERP.");
    expect(cleanEmail("Em xin quyền ERP.\n-- \nBình")).toBe("Em xin quyền ERP.");
  });

  it("bỏ khối {quote} của Jira", () => {
    expect(cleanEmail("Đã bổ sung.\n{quote}Câu hỏi cũ{quote}\nCảm ơn.")).toBe("Đã bổ sung.\n\nCảm ơn.");
  });

  it("chuẩn hóa tiếng Việt dạng tổ hợp về dạng dựng sẵn", () => {
    const decomposed = "Kế toán viên".normalize("NFD");
    expect(cleanEmail(decomposed)).toBe("Kế toán viên".normalize("NFC"));
  });

  it("trả về chuỗi rỗng khi không có nội dung", () => {
    expect(cleanEmail("  \n\n ")).toBe("");
  });
});
