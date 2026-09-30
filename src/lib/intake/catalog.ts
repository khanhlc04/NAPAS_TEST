export interface CatalogEntry {
  system: string;
  role: string;
}

export type Catalog = CatalogEntry[];

export const UNKNOWN_SYSTEM = "Không xác định";

interface JiraOption {
  value: string;
  disabled?: boolean;
}

/** Một hệ thống (tầng 1) như Jira trả về trong allowedValues của trường 2 tầng. */
export interface JiraCascadingOption extends JiraOption {
  cascadingOptions?: JiraOption[];
  children?: JiraOption[];
}

/** Chuyển danh sách lựa chọn 2 tầng của Jira thành danh mục phẳng "hệ thống, quyền". */
export function parseCatalog(allowedValues: JiraCascadingOption[]): Catalog {
  return allowedValues
    .filter((parent) => !parent.disabled)
    .flatMap((parent) =>
      (parent.cascadingOptions ?? parent.children ?? [])
        .filter((child) => !child.disabled)
        .map((child) => ({ system: parent.value, role: child.value })),
    );
}

export const labelOf = (entry: CatalogEntry) => `${entry.system} / ${entry.role}`;

const normalize = (text: string) => text.normalize("NFC").trim().toLowerCase();

/** Tìm mục danh mục theo nhãn "Hệ thống / Quyền", không phân biệt hoa thường và dạng dấu. */
export function findEntry(catalog: Catalog, label: string): CatalogEntry | null {
  const wanted = normalize(label);
  return catalog.find((entry) => normalize(labelOf(entry)) === wanted) ?? null;
}

export function groupBySystem(catalog: Catalog): Map<string, string[]> {
  const groups = new Map<string, string[]>();
  for (const { system, role } of catalog) groups.set(system, [...(groups.get(system) ?? []), role]);
  return groups;
}
