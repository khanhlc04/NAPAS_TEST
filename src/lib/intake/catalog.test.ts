import { describe, expect, it } from "vitest";
import { findEntry, groupBySystem, labelOf, parseCatalog } from "@/lib/intake/catalog";
import { CATALOG, CATALOG_ALLOWED_VALUES } from "@/lib/intake/catalog.fixture";

describe("parseCatalog", () => {
  it("làm phẳng 4 hệ thống thành 14 mục", () => {
    expect(CATALOG).toHaveLength(14);
    expect(CATALOG[0]).toEqual({ system: "Core Banking", role: "Xem báo cáo" });
    expect(labelOf(CATALOG[5])).toBe("ERP / Kế toán viên");
  });

  it("bỏ lựa chọn bị vô hiệu hóa và chấp nhận khóa children", () => {
    const parsed = parseCatalog([
      { value: "ERP", children: [{ value: "Xem" }, { value: "Cũ", disabled: true }] },
      { value: "Đã đóng", disabled: true, cascadingOptions: [{ value: "Xem" }] },
    ]);
    expect(parsed).toEqual([{ system: "ERP", role: "Xem" }]);
  });

  it("hệ thống không có quyền con thì không sinh mục nào", () => {
    expect(parseCatalog([{ value: "Trống" }, ...CATALOG_ALLOWED_VALUES])).toHaveLength(14);
  });
});

describe("findEntry", () => {
  it("khớp nhãn không phân biệt hoa thường và dạng dấu tiếng Việt", () => {
    expect(findEntry(CATALOG, "erp / kế toán viên")).toEqual({ system: "ERP", role: "Kế toán viên" });
    expect(findEntry(CATALOG, "ERP / Kế toán viên".normalize("NFD"))).toEqual({ system: "ERP", role: "Kế toán viên" });
  });

  it("trả về null cho nhãn ngoài danh mục", () => {
    expect(findEntry(CATALOG, "ERP / Quản trị viên")).toBeNull();
    expect(findEntry(CATALOG, "Không xác định")).toBeNull();
  });
});

describe("groupBySystem", () => {
  it("gom quyền theo hệ thống, giữ thứ tự", () => {
    expect(groupBySystem(CATALOG).get("Hệ thống tích hợp (ESB)")).toEqual(["Giám sát", "Vận hành API", "Quản trị"]);
  });
});
