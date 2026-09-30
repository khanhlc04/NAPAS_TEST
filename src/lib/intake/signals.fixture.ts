import type { Signals } from "@/lib/intake/decide";

/** Tín hiệu "email đủ thông tin, rõ ràng": ERP / Kế toán viên, Production. Ghi đè từng phần khi cần. */
export function makeSignals(overrides: Partial<Signals> = {}): Signals {
  return {
    model: "jev-test",
    isRequest: 0.97,
    system: { choice: "ERP / Kế toán viên", confidence: 0.93 },
    environment: { choice: "Production", confidence: 0.91 },
    requestKind: { choice: "Cấp mới", confidence: 0.88 },
    priority: { choice: "Thường", confidence: 0.85 },
    hasReason: 0.9,
    term: { choice: "Có ngày kết thúc cụ thể", confidence: 0.9 },
    abnormal: 0.02,
    ...overrides,
  };
}
