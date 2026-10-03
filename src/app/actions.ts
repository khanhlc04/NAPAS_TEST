"use server";

import { revalidatePath } from "next/cache";
import { getSupabase } from "@/lib/supabase";

export async function revalidateLogsAction() {
  revalidatePath("/");
}

/** Thêm các bản ghi mẫu thực tế để kiểm tra giao diện khi Supabase chưa có email thật */
export async function seedSampleLogsAction() {
  const supabase = getSupabase();
  const sampleLogs = [
    {
      issue_key: "DEMO-101",
      attempt: 1,
      input_hash: "hash_demo_101",
      model: "google/gemini-2.5-flash",
      confidence: 0.94,
      outcome: "filled",
      missing_fields: [],
      latency_ms: 680,
      error: null,
      output: {
        system: "ERP / Kế toán viên",
        environment: "Production",
        requestKind: "Cấp mới",
        priority: "Thường",
        dates: { start: "2026-10-01", end: "2026-12-31" },
        reason: "Làm quyết toán quý 4 phòng Tài chính - Kế toán",
        summary: "Xin cấp quyền Kế toán viên trên ERP",
      },
    },
    {
      issue_key: "DEMO-102",
      attempt: 1,
      input_hash: "hash_demo_102",
      model: "google/gemini-2.5-flash",
      confidence: 0.72,
      outcome: "asked",
      missing_fields: ["environment"],
      latency_ms: 720,
      error: null,
      output: {
        system: "Core Banking / Giao dịch viên",
        environment: null,
        missing: ["environment"],
        questionSent: "Chào bạn, xin vui lòng cho biết môi trường cần cấp quyền (Production, UAT, hay DR)?",
        summary: "Xin quyền Giao dịch viên Core Banking",
      },
    },
    {
      issue_key: "DEMO-103",
      attempt: 2,
      input_hash: "hash_demo_103",
      model: "google/gemini-2.5-flash",
      confidence: 0.96,
      outcome: "filled",
      missing_fields: [],
      latency_ms: 540,
      error: null,
      output: {
        system: "Core Banking / Xem báo cáo",
        environment: "UAT",
        requestKind: "Cấp mới",
        priority: "Thường",
        dates: { start: "2026-10-05", end: "2027-01-05" },
        reason: "Kiểm tra số liệu quý",
        summary: "Bổ sung môi trường UAT theo yêu cầu",
      },
    },
    {
      issue_key: "DEMO-104",
      attempt: 1,
      input_hash: "hash_demo_104",
      model: "google/gemini-2.5-flash",
      confidence: 0.45,
      outcome: "not_request",
      missing_fields: ["is_request"],
      latency_ms: 410,
      error: null,
      output: {
        is_request: false,
        note: "Email thông báo lịch họp giao ban nội bộ, không phải yêu cầu xin cấp quyền CNTT.",
      },
    },
    {
      issue_key: "DEMO-105",
      attempt: 1,
      input_hash: "hash_demo_105",
      model: "google/gemini-2.5-flash",
      confidence: 0.88,
      outcome: "filled",
      missing_fields: [],
      latency_ms: 610,
      error: null,
      output: {
        system: "Thanh toán liên ngân hàng / Tra soát",
        environment: "Production",
        requestKind: "Gia hạn",
        priority: "Khẩn",
        incidentCode: "INC-9921",
        dates: { start: "2026-10-02", end: "2026-10-09" },
        reason: "Xử lý sự cố tra soát giao dịch nghẽn mạng cuối ngày",
      },
    },
    {
      issue_key: "DEMO-106",
      attempt: 1,
      input_hash: "hash_demo_106",
      model: "google/gemini-2.5-flash",
      confidence: null,
      outcome: "failed",
      missing_fields: [],
      latency_ms: 3120,
      error: "Timeout 8000ms khi kết nối tới TypeSafe AI Gateway",
      output: null,
    },
  ];

  await supabase.from("ai_extractions").insert(sampleLogs);
  revalidatePath("/");
}

/** Xóa toàn bộ dữ liệu mẫu DEMO-* */
export async function clearSampleLogsAction() {
  const supabase = getSupabase();
  await supabase.from("ai_extractions").delete().like("issue_key", "DEMO-%");
  revalidatePath("/");
}
