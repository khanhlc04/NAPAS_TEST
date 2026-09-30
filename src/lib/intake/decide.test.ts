import { describe, expect, it } from "vitest";
import { CATALOG } from "@/lib/intake/catalog.fixture";
import { decide, type DecideInput } from "@/lib/intake/decide";
import { makeSignals } from "@/lib/intake/signals.fixture";

const input = (overrides: Partial<DecideInput> = {}): DecideInput => ({
  signals: makeSignals(),
  dates: { start: "2026-10-01", end: "2026-12-31", valid: true },
  incidentCode: null,
  reason: "Làm quyết toán quý 4",
  catalog: CATALOG,
  ...overrides,
});

describe("decide", () => {
  it("tự điền khi đủ thông tin và đủ tin cậy", () => {
    const decision = decide(input());
    expect(decision).toMatchObject({
      kind: "fill",
      fields: {
        system: "ERP", role: "Kế toán viên", environment: "Production", requestKind: "Cấp mới", priority: "Thường",
        startDate: "2026-10-01", endDate: "2026-12-31", reason: "Làm quyết toán quý 4", incidentCode: null,
      },
      confidence: 0.9,
    });
  });

  it("hỏi lại môi trường khi email không nêu", () => {
    const decision = decide(input({ signals: makeSignals({ environment: { choice: "Không nêu", confidence: 0.95 } }) }));
    expect(decision).toMatchObject({ kind: "ask", missing: ["environment"] });
  });

  it("hỏi lại hệ thống khi Jev trả về 'Không xác định', khi độ tin cậy thấp hoặc khi nhãn ngoài danh mục", () => {
    for (const system of [
      { choice: "Không xác định", confidence: 0.99 },
      { choice: "ERP / Kế toán viên", confidence: 0.79 },
      { choice: "ERP / Quản trị viên", confidence: 0.99 },
    ]) {
      expect(decide(input({ signals: makeSignals({ system }) }))).toMatchObject({ kind: "ask", missing: ["system"] });
    }
  });

  it("hỏi lại ngày khi thiếu một đầu, và dùng câu riêng khi ngày kết thúc trước ngày bắt đầu", () => {
    expect(decide(input({ dates: { start: "2026-10-01", end: null, valid: true } }))).toMatchObject({ missing: ["dates"] });
    expect(decide(input({ dates: { start: "2026-10-20", end: "2026-10-05", valid: false } }))).toMatchObject({ missing: ["dates_order"] });
  });

  it("hỏi lại lý do khi Jev không thấy lý do hoặc nội dung rỗng", () => {
    expect(decide(input({ signals: makeSignals({ hasReason: 0.4 }) }))).toMatchObject({ missing: ["reason"] });
    expect(decide(input({ reason: "  " }))).toMatchObject({ missing: ["reason"] });
  });

  it("gom mọi thứ còn thiếu theo thứ tự cố định", () => {
    const decision = decide(input({
      signals: makeSignals({ environment: { choice: "Không nêu", confidence: 0.9 }, hasReason: 0.1 }),
      dates: { start: null, end: null, valid: true },
    }));
    expect(decision).toMatchObject({ kind: "ask", missing: ["environment", "dates", "reason"] });
  });

  it("không phải yêu cầu cấp quyền khi xác suất dưới 0,3", () => {
    expect(decide(input({ signals: makeSignals({ isRequest: 0.1 }) }))).toMatchObject({ kind: "not_request" });
  });

  it("xác suất ở giữa 0,3 và 0,8 thì hỏi lại xem có đúng là xin quyền không", () => {
    expect(decide(input({ signals: makeSignals({ isRequest: 0.5 }) }))).toMatchObject({ kind: "ask", missing: ["is_request"] });
  });

  it("dùng mặc định Cấp mới và Thường khi độ tin cậy dưới 0,6, kèm cảnh báo", () => {
    const decision = decide(input({
      signals: makeSignals({ requestKind: { choice: "Gia hạn", confidence: 0.4 }, priority: { choice: "Khẩn", confidence: 0.5 } }),
    }));
    expect(decision).toMatchObject({ kind: "fill", fields: { requestKind: "Cấp mới", priority: "Thường" } });
    expect(decision.warnings).toHaveLength(2);
  });

  it("có dấu hiệu bất thường vẫn xử lý bình thường nhưng thêm cảnh báo cho người duyệt", () => {
    const decision = decide(input({ signals: makeSignals({ abnormal: 0.9 }) }));
    expect(decision.kind).toBe("fill");
    expect(decision.warnings[0]).toContain("Có dấu hiệu bất thường");
  });

  it("cảnh báo khi Jev và bộ phân tích ngày không khớp về thời hạn", () => {
    const decision = decide(input({ signals: makeSignals({ term: { choice: "Không nêu", confidence: 0.95 } }) }));
    expect(decision.warnings.join(" ")).toContain("Kiểm tra lại ngày");
  });

  it("chuyển mã sự cố và cắt lý do quá dài", () => {
    const decision = decide(input({ incidentCode: "INC-2026-0042", reason: "x".repeat(5000) }));
    expect(decision).toMatchObject({ kind: "fill", fields: { incidentCode: "INC-2026-0042" } });
    if (decision.kind === "fill") expect(decision.fields.reason).toHaveLength(2000);
  });
});
