/** Tên trường, trạng thái và transition theo cấu hình buổi 1. Hub tra id theo tên, không ghi cứng id. */
export const FIELD = {
  system: "Hệ thống / Quyền",
  environment: "Môi trường",
  requestKind: "Loại yêu cầu",
  startDate: "Ngày bắt đầu",
  endDate: "Ngày kết thúc",
  incident: "Mã sự cố",
  reason: "Lý do nghiệp vụ",
  channel: "Kênh tiếp nhận",
} as const;

export const STATUS_NEW = "Mới";
export const TRANSITION_NEED_INFO = "Yêu cầu bổ sung";
