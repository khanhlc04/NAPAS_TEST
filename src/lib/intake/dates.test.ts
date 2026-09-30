import { describe, expect, it } from "vitest";
import { parseDateRange, todayInVn } from "@/lib/intake/dates";

// 2026-09-30 là thứ Tư.
const TODAY = "2026-09-30";
const parse = (text: string) => parseDateRange(text, TODAY);

describe("todayInVn", () => {
  it("tính theo múi giờ Việt Nam, không theo UTC", () => {
    expect(todayInVn(new Date("2026-09-30T18:30:00Z"))).toBe("2026-10-01");
    expect(todayInVn(new Date("2026-09-30T16:30:00Z"))).toBe("2026-09-30");
  });
});

describe("parseDateRange", () => {
  it("từ 1/10 đến hết năm", () => {
    expect(parse("Xin quyền từ 1/10 đến hết năm để làm quyết toán")).toEqual({ start: "2026-10-01", end: "2026-12-31", valid: true });
  });

  it("ngày đầy đủ dd/mm/yyyy và dạng ISO", () => {
    expect(parse("từ 01/10/2026 đến 31/12/2026")).toMatchObject({ start: "2026-10-01", end: "2026-12-31" });
    expect(parse("từ 2026-10-05 đến 2026-10-20")).toMatchObject({ start: "2026-10-05", end: "2026-10-20" });
  });

  it("viết không dấu và viết hoa vẫn nhận", () => {
    expect(parse("TU 1/10 DEN HET NAM")).toMatchObject({ start: "2026-10-01", end: "2026-12-31" });
    expect(parse("Từ ĐẦU tháng, đến hết năm")).toMatchObject({ end: "2026-12-31" });
  });

  it("ngày viết bằng chữ: ngày 5 tháng 10", () => {
    expect(parse("từ ngày 5 tháng 10 đến ngày 20 tháng 10")).toMatchObject({ start: "2026-10-05", end: "2026-10-20" });
  });

  it("thứ Hai tuần sau, trong 3 tháng", () => {
    expect(parse("từ thứ Hai tuần sau, trong 3 tháng")).toEqual({ start: "2026-10-05", end: "2027-01-05", valid: true });
  });

  it("khoảng N ngày, N tuần tính từ ngày bắt đầu", () => {
    expect(parse("trong 90 ngày kể từ hôm nay")).toMatchObject({ start: "2026-09-30", end: "2026-12-29" });
    expect(parse("trong 2 tuần từ ngày mai")).toMatchObject({ start: "2026-10-01", end: "2026-10-15" });
    expect(parse("từ 10/10 trong 2 tuần")).toMatchObject({ start: "2026-10-10", end: "2026-10-24" });
  });

  it("cộng tháng không tràn qua cuối tháng", () => {
    expect(parse("từ 31/1/2027 trong 1 tháng")).toMatchObject({ start: "2027-01-31", end: "2027-02-28" });
  });

  it("gia hạn thêm 3 tháng kể từ một ngày có ghi năm", () => {
    expect(parse("gia hạn thêm 3 tháng kể từ 01/10/2026")).toMatchObject({ start: "2026-10-01", end: "2027-01-01" });
  });

  it("từ hôm nay đến một ngày cụ thể", () => {
    expect(parse("từ hôm nay đến 31/12")).toMatchObject({ start: "2026-09-30", end: "2026-12-31" });
  });

  it("ngày bắt đầu không ghi năm mà đã qua thì lấy năm sau, ngày kết thúc theo năm của ngày bắt đầu", () => {
    expect(parse("từ 15/9 đến hết năm")).toMatchObject({ start: "2027-09-15", end: "2027-12-31" });
  });

  it("chỉ có một đầu thì đầu kia là null", () => {
    expect(parse("từ 1/10")).toEqual({ start: "2026-10-01", end: null, valid: true });
    expect(parse("đến 31/12")).toEqual({ start: null, end: "2026-12-31", valid: true });
    expect(parse("Cần quyền để làm quyết toán")).toEqual({ start: null, end: null, valid: true });
  });

  it("ngày kết thúc trước ngày bắt đầu thì đánh dấu không hợp lệ, không tự đoán sang năm sau", () => {
    expect(parse("từ 20/10 đến 5/10")).toEqual({ start: "2026-10-20", end: "2026-10-05", valid: false });
  });

  it("bỏ qua ngày không có thật và những chuỗi trông giống ngày", () => {
    expect(parse("ngày 31/2 hoặc 32/1")).toEqual({ start: null, end: null, valid: true });
    expect(parse("sự cố INC-2026-0042 lúc 10:30, hỗ trợ 24/7, phiên bản 1.2.3")).toEqual({ start: null, end: null, valid: true });
  });

  it("thứ trong tuần không kèm tuần nay/tuần sau thì không đoán", () => {
    expect(parse("làm theo thứ tự ưu tiên, thứ Hai gặp")).toEqual({ start: null, end: null, valid: true });
  });
});
