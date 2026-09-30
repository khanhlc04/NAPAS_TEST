import type { Catalog } from "@/lib/intake/catalog";
import { findEntry, UNKNOWN_SYSTEM } from "@/lib/intake/catalog";
import type { DateRange } from "@/lib/intake/dates";
import type { MissingField } from "@/lib/intake/questions";

export interface Chosen<T extends string = string> {
  choice: T;
  confidence: number;
}

/** Đầu ra của Jev cho 8 câu hỏi (spec 05 mục 3). Xác suất Noul nằm trong 0–1. */
export interface Signals {
  model: string;
  isRequest: number;
  system: Chosen;
  environment: Chosen<"Production" | "UAT" | "Không nêu">;
  requestKind: Chosen<"Cấp mới" | "Điều chỉnh" | "Gia hạn">;
  priority: Chosen<"Khẩn" | "Cao" | "Thường">;
  hasReason: number;
  term: Chosen<"Có ngày kết thúc cụ thể" | "Khoảng thời gian" | "Không nêu">;
  abnormal: number;
  /** Câu trả lời gốc của Jev, kèm xác suất từng lựa chọn, để ghi vào nhật ký AI. */
  raw?: Record<string, unknown>;
}

export interface Thresholds {
  isRequest: number;
  notRequest: number;
  system: number;
  environment: number;
  reason: number;
  fallback: number;
  abnormal: number;
  maxAsks: number;
}

/** Giá trị theo spec 05 mục 4. Chỉnh lại sau khi chạy bộ email kiểm thử. */
export const DEFAULT_THRESHOLDS: Thresholds = {
  isRequest: 0.8,
  notRequest: 0.3,
  system: 0.8,
  environment: 0.8,
  reason: 0.6,
  fallback: 0.6,
  abnormal: 0.5,
  maxAsks: 3,
};

export interface FilledFields {
  system: string;
  role: string;
  environment: "Production" | "UAT";
  requestKind: "Cấp mới" | "Điều chỉnh" | "Gia hạn";
  priority: "Khẩn" | "Cao" | "Thường";
  startDate: string;
  endDate: string;
  reason: string;
  incidentCode: string | null;
}

export type Decision =
  | { kind: "fill"; fields: FilledFields; warnings: string[]; confidence: number }
  | { kind: "ask"; missing: MissingField[]; warnings: string[] }
  | { kind: "not_request"; warnings: string[] };

export interface DecideInput {
  signals: Signals;
  dates: DateRange;
  incidentCode: string | null;
  reason: string;
  catalog: Catalog;
  thresholds?: Thresholds;
}

const REASON_MAX_LENGTH = 2000;

export function decide(input: DecideInput): Decision {
  const { signals: s, dates, catalog } = input;
  const t = input.thresholds ?? DEFAULT_THRESHOLDS;
  const warnings: string[] = [];

  if (s.abnormal >= t.abnormal) {
    warnings.push(
      "Có dấu hiệu bất thường: email có thể chứa chỉ dẫn bỏ qua phê duyệt hoặc điều khiển hệ thống. Người duyệt kiểm tra kỹ. AI không có quyền duyệt.",
    );
  }
  if (s.isRequest < t.notRequest) return { kind: "not_request", warnings };

  const entry = s.system.choice === UNKNOWN_SYSTEM || s.system.confidence < t.system ? null : findEntry(catalog, s.system.choice);
  const environment = s.environment.choice === "Không nêu" || s.environment.confidence < t.environment ? null : s.environment.choice;
  const { start, end } = dates;
  const reason = input.reason.trim().slice(0, REASON_MAX_LENGTH);

  const missing: MissingField[] = [];
  if (s.isRequest < t.isRequest) missing.push("is_request");
  if (!entry) missing.push("system");
  if (!environment) missing.push("environment");
  if (!start || !end) missing.push("dates");
  else if (!dates.valid) missing.push("dates_order");
  if (s.hasReason < t.reason || reason.length === 0) missing.push("reason");

  if (missing.length > 0 || !entry || !environment || !start || !end) return { kind: "ask", missing, warnings };

  const requestKind = s.requestKind.confidence >= t.fallback ? s.requestKind.choice : "Cấp mới";
  const priority = s.priority.confidence >= t.fallback ? s.priority.choice : "Thường";
  if (requestKind !== s.requestKind.choice) warnings.push(`Loại yêu cầu: độ tin cậy thấp, dùng mặc định "${requestKind}".`);
  if (priority !== s.priority.choice) warnings.push(`Mức ưu tiên: độ tin cậy thấp, dùng mặc định "${priority}".`);
  if (s.term.choice === "Không nêu" && s.term.confidence >= t.system) {
    warnings.push("Bộ phân tích ngày tìm được thời hạn nhưng AI cho rằng email không nêu thời hạn. Kiểm tra lại ngày bắt đầu và kết thúc.");
  }

  return {
    kind: "fill",
    fields: {
      system: entry.system,
      role: entry.role,
      environment,
      requestKind,
      priority,
      startDate: start,
      endDate: end,
      reason,
      incidentCode: input.incidentCode,
    },
    warnings,
    confidence: Math.min(s.isRequest, s.system.confidence, s.environment.confidence, s.hasReason),
  };
}
