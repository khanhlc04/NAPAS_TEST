import { describe, expect, it } from "vitest";
import type { Classifier, JevState } from "@/lib/ai/jev";
import { analyze } from "@/lib/intake/analyze";
import { CATALOG } from "@/lib/intake/catalog.fixture";
import { makeSignals } from "@/lib/intake/signals.fixture";

function spyClassifier() {
  const states: JevState[] = [];
  const classifier: Classifier = { async classify({ state }) { states.push(state); return makeSignals(); } };
  return { classifier, states };
}

describe("analyze", () => {
  it("chỉ gửi cho Jev phần người viết tự gõ: không có thư cũ và chữ ký", async () => {
    const { classifier, states } = spyClassifier();
    await analyze({
      subject: "Xin quyền ERP", catalog: CATALOG, classifier, today: "2026-09-30",
      body: "Em xin quyền Kế toán viên trên ERP, Production, từ 1/10 đến hết năm để làm quyết toán.\n\nTrân trọng,\nBình",
      comments: ["> câu hỏi cũ\nMôi trường là Production."],
    });
    expect(states[0]).toEqual({
      tieu_de: "Xin quyền ERP",
      noi_dung: "Em xin quyền Kế toán viên trên ERP, Production, từ 1/10 đến hết năm để làm quyết toán.",
      binh_luan_bo_sung: ["Môi trường là Production."],
    });
  });

  it("điền được khi email đủ thông tin: ngày và mã sự cố do code bóc", async () => {
    const { classifier } = spyClassifier();
    const analysis = await analyze({
      subject: "Khẩn: xin quyền ERP", catalog: CATALOG, classifier, today: "2026-09-30", comments: [],
      body: "Sự cố INC-2026-0042, em cần quyền Kế toán viên trên ERP từ 1/10 đến hết năm để làm quyết toán.",
    });
    expect(analysis.dates).toEqual({ start: "2026-10-01", end: "2026-12-31", valid: true });
    expect(analysis.incidentCode).toBe("INC-2026-0042");
    expect(analysis.decision).toMatchObject({ kind: "fill", fields: { startDate: "2026-10-01", incidentCode: "INC-2026-0042" } });
  });

  it("hỏi lại khi email không có ngày nào", async () => {
    const { classifier } = spyClassifier();
    const analysis = await analyze({
      subject: "Xin quyền", catalog: CATALOG, classifier, today: "2026-09-30", comments: [],
      body: "Em xin quyền Kế toán viên trên ERP để làm quyết toán.",
    });
    expect(analysis.decision).toMatchObject({ kind: "ask", missing: ["dates"] });
  });

  it("lỗi của Jev được ném ra cho nơi gọi xử lý", async () => {
    const classifier: Classifier = { async classify() { throw new Error("Jev 500"); } };
    await expect(analyze({ subject: "s", body: "b", comments: [], catalog: CATALOG, classifier, today: "2026-09-30" })).rejects.toThrow("Jev 500");
  });
});
