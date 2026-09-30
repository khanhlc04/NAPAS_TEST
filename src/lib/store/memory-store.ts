import type { ExtractionRecord, ExtractionStore } from "@/lib/store/extractions";

/** Bản lưu trong bộ nhớ, dùng cho kiểm thử. Cùng quy tắc với bản Supabase. */
export function createMemoryStore(): ExtractionStore & { rows: ExtractionRecord[] } {
  const rows: ExtractionRecord[] = [];
  return {
    rows,
    async history(issueKey) {
      const mine = rows.filter((row) => row.issueKey === issueKey);
      return { attempts: mine.length, asks: mine.filter((row) => row.outcome === "asked").length };
    },
    async hasProcessed(issueKey, inputHash) {
      return rows.some((row) => row.issueKey === issueKey && row.inputHash === inputHash && row.outcome !== "failed");
    },
    async save(record) {
      rows.push(record);
    },
  };
}
