import type { Catalog } from "@/lib/intake/catalog";
import { groupBySystem } from "@/lib/intake/catalog";

export type MissingField = "is_request" | "system" | "environment" | "dates" | "dates_order" | "reason";

const FIXED: Record<Exclude<MissingField, "system">, string> = {
  is_request:
    "Anh/chị có đang muốn xin cấp, điều chỉnh hoặc gia hạn quyền truy cập hệ thống không? Nếu có, vui lòng nêu hệ thống, quyền cần dùng, môi trường và thời gian sử dụng.",
  environment: "Anh/chị cần quyền trên môi trường Production hay UAT?",
  dates: "Anh/chị cần quyền từ ngày nào đến ngày nào? (ví dụ: từ 01/10/2026 đến 31/12/2026)",
  dates_order:
    "Ngày kết thúc đang trước ngày bắt đầu. Anh/chị vui lòng xác nhận lại khoảng thời gian cần quyền (ví dụ: từ 01/10/2026 đến 31/12/2026).",
  reason: "Anh/chị vui lòng cho biết lý do công việc cần quyền này?",
};

function systemQuestion(catalog: Catalog): string {
  const list = [...groupBySystem(catalog)].map(([system, roles]) => `${system}: ${roles.join(", ")}`).join("; ");
  return `Anh/chị cần quyền nào trên hệ thống nào? Danh mục hiện có: ${list}.`;
}

/** Ghép câu hỏi lại từ câu mẫu cố định, để nội dung không bao giờ lệch. */
export function buildFollowUp(input: { name: string; missing: MissingField[]; catalog: Catalog }): string {
  const items = input.missing.map(
    (field, index) => `${index + 1}. ${field === "system" ? systemQuestion(input.catalog) : FIXED[field]}`,
  );
  return [
    `Chào ${input.name},`,
    "Để xử lý yêu cầu cấp quyền, chúng tôi cần anh/chị bổ sung:",
    ...items,
    "Anh/chị trả lời trực tiếp email này, hệ thống sẽ tự cập nhật. Vui lòng không gửi mật khẩu hay thông tin đăng nhập.",
  ].join("\n");
}
