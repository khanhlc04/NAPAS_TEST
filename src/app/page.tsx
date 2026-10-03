import { getEnv } from "@/lib/env";
import { getSupabase } from "@/lib/supabase";
import { AiLogViewer, type ExtractionItem, type KpiStats } from "@/app/components/ai-log-viewer";

export const dynamic = "force-dynamic";

export default async function Home() {
  const env = getEnv();
  const supabase = getSupabase();

  // Đọc danh sách bản ghi mới nhất từ bảng ai_extractions trong Supabase
  const { data, error } = await supabase
    .from("ai_extractions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(150);

  if (error) {
    console.error("Lỗi truy vấn ai_extractions từ Supabase:", error);
  }

  const logs = ((data ?? []) as ExtractionItem[]).map((row) => ({
    id: row.id,
    issue_key: row.issue_key,
    attempt: row.attempt,
    input_hash: row.input_hash,
    model: row.model,
    output: row.output,
    confidence: row.confidence !== null ? Number(row.confidence) : null,
    outcome: row.outcome,
    missing_fields: Array.isArray(row.missing_fields) ? row.missing_fields : [],
    latency_ms: row.latency_ms !== null ? Number(row.latency_ms) : null,
    error: row.error,
    created_at: row.created_at,
  }));

  // Tính toán các chỉ số KPI
  const total = logs.length;
  const filled = logs.filter((l) => l.outcome === "filled").length;
  const asked = logs.filter((l) => l.outcome === "asked").length;
  const notRequest = logs.filter((l) => l.outcome === "not_request").length;
  const failed = logs.filter((l) => l.outcome === "failed").length;

  const latencies = logs.filter((l) => typeof l.latency_ms === "number" && l.latency_ms > 0).map((l) => l.latency_ms as number);
  const avgLatencyMs = latencies.length > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0;
  const fillRate = total > 0 ? Math.round((filled / total) * 100) : 0;

  const kpi: KpiStats = {
    total,
    filled,
    asked,
    notRequest,
    failed,
    avgLatencyMs,
    fillRate,
  };

  return <AiLogViewer initialLogs={logs} jiraBaseUrl={env.JIRA_BASE_URL} kpi={kpi} />;
}
