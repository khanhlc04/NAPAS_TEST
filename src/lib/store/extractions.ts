import type { SupabaseClient } from "@supabase/supabase-js";

export type Outcome = "filled" | "asked" | "not_request" | "failed";

export interface ExtractionRecord {
  issueKey: string;
  attempt: number;
  inputHash: string;
  model: string;
  output: unknown;
  confidence: number | null;
  outcome: Outcome;
  missingFields: string[];
  latencyMs: number;
  error: string | null;
}

/** Nhật ký mỗi lần AI đọc email (bảng ai_extractions). */
export interface ExtractionStore {
  /** Số lần đã xử lý và số lần đã hỏi lại người yêu cầu. */
  history(issueKey: string): Promise<{ attempts: number; asks: number }>;
  /** Đã xử lý xong nội dung này chưa. Lần thất bại không tính, để được thử lại. */
  hasProcessed(issueKey: string, inputHash: string): Promise<boolean>;
  save(record: ExtractionRecord): Promise<void>;
}

export function createSupabaseStore(client: SupabaseClient): ExtractionStore {
  return {
    async history(issueKey) {
      const { data, error } = await client.from("ai_extractions").select("outcome").eq("issue_key", issueKey);
      if (error) throw new Error(`Supabase: ${error.message}`);
      const rows = data ?? [];
      return { attempts: rows.length, asks: rows.filter((row) => row.outcome === "asked").length };
    },

    async hasProcessed(issueKey, inputHash) {
      const { count, error } = await client
        .from("ai_extractions")
        .select("id", { count: "exact", head: true })
        .eq("issue_key", issueKey)
        .eq("input_hash", inputHash)
        .neq("outcome", "failed");
      if (error) throw new Error(`Supabase: ${error.message}`);
      return (count ?? 0) > 0;
    },

    async save(record) {
      const { error } = await client.from("ai_extractions").insert({
        issue_key: record.issueKey,
        attempt: record.attempt,
        input_hash: record.inputHash,
        model: record.model,
        output: record.output,
        confidence: record.confidence,
        outcome: record.outcome,
        missing_fields: record.missingFields,
        latency_ms: record.latencyMs,
        error: record.error,
      });
      if (error) throw new Error(`Supabase: ${error.message}`);
    },
  };
}
