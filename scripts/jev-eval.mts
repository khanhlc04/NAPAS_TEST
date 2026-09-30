// Chạy bộ 10 email mẫu qua Jev thật để xem AI xử lý tiếng Việt tốt đến đâu.
// Cách chạy: npm run eval:jev   (cần TYPESAFE_API_KEY và JEV_MODEL trong .env.local)
import { TypeSafeClient } from "@typesafe-ai/sdk";
import { createJevClassifier } from "@/lib/ai/jev";
import { analyze } from "@/lib/intake/analyze";
import { CATALOG } from "@/lib/intake/catalog.fixture";
import { EVAL_EMAILS, EVAL_TODAY } from "@/lib/intake/emails.fixture";
import { compareWithExpectation } from "@/lib/intake/eval";

const model = process.env.JEV_MODEL ?? "jev-latest";
const classifier = createJevClassifier(new TypeSafeClient({ defaultModel: model, timeout: 15000 }), model);

let hardFailures = 0;
let softMisses = 0;
let totalMs = 0;

for (const email of EVAL_EMAILS) {
  const startedAt = Date.now();
  try {
    const analysis = await analyze({ subject: email.subject, body: email.body, comments: [], catalog: CATALOG, classifier, today: EVAL_TODAY });
    const elapsed = Date.now() - startedAt;
    totalMs += elapsed;
    const problems = compareWithExpectation(email.expect, analysis);
    const s = analysis.signals;
    const verdict = problems.length === 0 ? "ĐẠT " : email.expect.soft ? "LỆCH (mềm)" : "LỆCH";
    if (problems.length > 0) email.expect.soft ? softMisses++ : hardFailures++;
    console.log(`\n[${email.id}] ${email.title}: ${verdict} (${elapsed} ms)`);
    console.log(`    kết quả=${analysis.decision.kind}  là-yêu-cầu=${s.isRequest.toFixed(2)}  bất-thường=${s.abnormal.toFixed(2)}  có-lý-do=${s.hasReason.toFixed(2)}`);
    console.log(`    hệ thống=${s.system.choice} (${s.system.confidence.toFixed(2)})  môi trường=${s.environment.choice} (${s.environment.confidence.toFixed(2)})`);
    console.log(`    loại=${s.requestKind.choice} (${s.requestKind.confidence.toFixed(2)})  ưu tiên=${s.priority.choice} (${s.priority.confidence.toFixed(2)})  ngày=${analysis.dates.start}→${analysis.dates.end}`);
    for (const problem of problems) console.log(`    - ${problem}`);
  } catch (error) {
    hardFailures++;
    console.log(`\n[${email.id}] ${email.title}: LỖI GỌI JEV: ${error instanceof Error ? error.message : error}`);
  }
}

console.log(`\nTổng: ${EVAL_EMAILS.length - hardFailures - softMisses}/${EVAL_EMAILS.length} đạt, ${softMisses} lệch mềm, ${hardFailures} lệch cứng. Trung bình ${Math.round(totalMs / EVAL_EMAILS.length)} ms/email.`);
