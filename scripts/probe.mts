// Dò kết nối thật tới Jira và Supabase bằng cấu hình trong .env.local.
// Cách chạy: npm run probe -- CQ-1   (CQ-1 là mã một yêu cầu có sẵn)
import { createClient } from "@supabase/supabase-js";
import { createDeps } from "@/lib/deps";
import { parseEnv } from "@/lib/env";

const issueKey = process.argv[2];
if (!issueKey) throw new Error("Thiếu mã yêu cầu. Ví dụ: npm run probe -- CQ-1");

const env = parseEnv(process.env);
const deps = createDeps(env);

console.log(`1. Jira: đọc yêu cầu ${issueKey}`);
const issue = await deps.jira.getIssue(issueKey);
console.log(`   trạng thái="${issue.status}"  người báo="${issue.reporter.displayName}"  đã điền hệ thống=${issue.systemFilled}  kênh=${issue.channel}`);

console.log("2. Jira: đọc danh mục Hệ thống / Quyền từ editmeta");
const catalog = await deps.jira.getCatalog(issueKey);
console.log(`   ${catalog.length} mục (mong đợi 14). Mục đầu: ${catalog[0]?.system} / ${catalog[0]?.role}`);

console.log("3. Supabase: ghi rồi xóa một dòng thử vào ai_extractions");
await deps.store.save({
  issueKey: "PROBE-0", attempt: 1, inputHash: "probe", model: "probe", output: { probe: true },
  confidence: null, outcome: "failed", missingFields: [], latencyMs: 0, error: "dòng thử, xóa ngay",
});
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { error } = await supabase.from("ai_extractions").delete().eq("issue_key", "PROBE-0");
if (error) throw new Error(`Không xóa được dòng thử: ${error.message}`);
console.log("   ghi và xóa thành công");
console.log("\nTất cả kết nối đều ổn.");
