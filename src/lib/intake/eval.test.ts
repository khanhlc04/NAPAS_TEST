import { describe, expect, it } from "vitest";
import { analyze } from "@/lib/intake/analyze";
import { CATALOG } from "@/lib/intake/catalog.fixture";
import { EVAL_EMAILS, EVAL_TODAY } from "@/lib/intake/emails.fixture";
import { compareWithExpectation } from "@/lib/intake/eval";
import { makeSignals } from "@/lib/intake/signals.fixture";

const first = EVAL_EMAILS[0];

async function run(signalsOverride = {}) {
  return analyze({
    subject: first.subject, body: first.body, comments: [], catalog: CATALOG, today: EVAL_TODAY,
    classifier: { async classify() { return makeSignals(signalsOverride); } },
  });
}

describe("compareWithExpectation", () => {
  it("khớp khi kết quả đúng như kỳ vọng", async () => {
    expect(compareWithExpectation(first.expect, await run())).toEqual([]);
  });

  it("chỉ ra từng điểm lệch", async () => {
    const analysis = await run({ system: { choice: "ERP / Xem", confidence: 0.95 }, environment: { choice: "UAT", confidence: 0.95 } });
    expect(compareWithExpectation(first.expect, analysis)).toEqual(["hệ thống ERP / Xem", "môi trường UAT"]);
  });

  it("báo lệch loại kết quả", async () => {
    const analysis = await run({ isRequest: 0.05 });
    expect(compareWithExpectation(first.expect, analysis)[0]).toBe("kết quả not_request, mong đợi fill");
  });
});
