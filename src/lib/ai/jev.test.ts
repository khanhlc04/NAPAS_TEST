import { describe, expect, it } from "vitest";
import { buildQuestions, createJevClassifier, JevResponseError, parseSignals, type JevLike } from "@/lib/ai/jev";
import { CATALOG } from "@/lib/intake/catalog.fixture";

const choiceAnswer = (choice: string, confidence = 0.9) => ({ type: "choice", choice, confidence, probabilities: { [choice]: confidence } });
const noulAnswer = (noul: number) => ({ type: "noul", noul });

const goodAnswers = () => ({
  la_yeu_cau_cap_quyen: noulAnswer(0.98),
  he_thong_quyen: choiceAnswer("ERP / Kế toán viên", 0.94),
  moi_truong: choiceAnswer("Production"),
  loai_yeu_cau: choiceAnswer("Cấp mới"),
  uu_tien: choiceAnswer("Thường"),
  co_ly_do: noulAnswer(0.9),
  thoi_han: choiceAnswer("Có ngày kết thúc cụ thể"),
  bat_thuong: noulAnswer(0.03),
});

describe("buildQuestions", () => {
  it("có đủ 8 câu hỏi và 15 nhãn hệ thống (14 quyền cộng 'Không xác định')", () => {
    const questions = buildQuestions(CATALOG);
    expect(Object.keys(questions)).toEqual([
      "la_yeu_cau_cap_quyen", "he_thong_quyen", "moi_truong", "loai_yeu_cau", "uu_tien", "co_ly_do", "thoi_han", "bat_thuong",
    ]);
    const system = questions.he_thong_quyen;
    expect(system.type === "choice" && Object.keys(system.criteria)).toHaveLength(15);
    expect(system.type === "choice" && system.criteria["ERP / Kế toán viên"]).toContain("Kế toán viên");
  });
});

describe("parseSignals", () => {
  it("chuyển câu trả lời của Jev thành tín hiệu", () => {
    const answers = goodAnswers();
    const signals = parseSignals("jev-test", answers);
    expect(signals.raw).toBe(answers);
    expect(signals).toMatchObject({
      model: "jev-test", isRequest: 0.98, hasReason: 0.9, abnormal: 0.03,
      system: { choice: "ERP / Kế toán viên", confidence: 0.94 },
      environment: { choice: "Production", confidence: 0.9 },
    });
  });

  it("từ chối câu trả lời thiếu hoặc sai dạng", () => {
    const { bat_thuong: _dropped, ...missing } = goodAnswers();
    expect(() => parseSignals("m", missing)).toThrow(JevResponseError);
    expect(() => parseSignals("m", { ...goodAnswers(), la_yeu_cau_cap_quyen: choiceAnswer("có") })).toThrow(/noul/);
  });

  it("từ chối giá trị nằm ngoài danh sách cho phép", () => {
    expect(() => parseSignals("m", { ...goodAnswers(), moi_truong: choiceAnswer("Staging") })).toThrow(/ngoài danh sách/);
  });
});

describe("createJevClassifier", () => {
  it("gửi trạng thái, câu hỏi và model đã ghim, rồi trả về tín hiệu", async () => {
    const seen: unknown[] = [];
    const client: JevLike = {
      async systemOne(request) {
        seen.push(request);
        return { model: "jev-1.13.0", answers: goodAnswers() };
      },
    };
    const state = { tieu_de: "Xin quyền ERP", noi_dung: "Em xin quyền Kế toán viên", binh_luan_bo_sung: [] };
    const signals = await createJevClassifier(client, "jev-1.13.0").classify({ state, catalog: CATALOG });
    expect(signals.model).toBe("jev-1.13.0");
    expect(seen[0]).toMatchObject({ state, model: "jev-1.13.0" });
  });
});
