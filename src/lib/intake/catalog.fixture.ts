import type { JiraCascadingOption } from "@/lib/intake/catalog";
import { parseCatalog } from "@/lib/intake/catalog";

const option = (value: string) => ({ value });

/** Dạng Jira trả về cho trường "Hệ thống / Quyền": 4 hệ thống, 14 quyền. */
export const CATALOG_ALLOWED_VALUES: JiraCascadingOption[] = [
  { value: "Core Banking", cascadingOptions: ["Xem báo cáo", "Giao dịch viên", "Kiểm soát viên", "Quản trị hệ thống"].map(option) },
  { value: "ERP", cascadingOptions: ["Xem", "Kế toán viên", "Phê duyệt thanh toán", "Quản trị"].map(option) },
  { value: "Hệ thống tích hợp (ESB)", cascadingOptions: ["Giám sát", "Vận hành API", "Quản trị"].map(option) },
  { value: "Hệ thống đối soát", cascadingOptions: ["Xem", "Chuyên viên đối soát", "Quản trị"].map(option) },
];

export const CATALOG = parseCatalog(CATALOG_ALLOWED_VALUES);
