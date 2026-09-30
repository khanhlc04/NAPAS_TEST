import { createJiraHttp } from "@/lib/jira/http";

export interface FakeCall {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: unknown;
}

/**
 * Jira giả cho kiểm thử. Khóa của `routes` là "METHOD /đường-dẫn" (không có query).
 * Giá trị: dữ liệu JSON, `null` (trả 204), hoặc hàm tạo Response mới cho mỗi lần gọi.
 */
export function fakeJira(routes: Record<string, unknown>) {
  const calls: FakeCall[] = [];
  const fetchImpl = (async (input: string, init: RequestInit = {}) => {
    const url = new URL(input);
    const method = init.method ?? "GET";
    calls.push({ method, url: url.pathname + url.search, headers: init.headers as Record<string, string>, body: init.body ? JSON.parse(init.body as string) : undefined });
    const route = routes[`${method} ${url.pathname}`];
    if (typeof route === "function") return route();
    if (route === undefined) return new Response("not found", { status: 404 });
    return new Response(route === null ? null : JSON.stringify(route), { status: route === null ? 204 : 200 });
  }) as typeof fetch;
  const http = createJiraHttp({ baseUrl: "https://demo.atlassian.net", email: "hub@example.com", apiToken: "tok", fetchImpl });
  return { http, calls };
}

/** Danh sách trường tùy chỉnh như Jira trả về ở /rest/api/2/field. */
export const FIELDS = [
  { id: "customfield_10088", name: "Hệ thống / Quyền" }, { id: "customfield_10089", name: "Môi trường" },
  { id: "customfield_10090", name: "Loại yêu cầu" }, { id: "customfield_10087", name: "Ngày bắt đầu" },
  { id: "customfield_10091", name: "Ngày kết thúc" }, { id: "customfield_10092", name: "Mã sự cố" },
  { id: "customfield_10093", name: "Lý do nghiệp vụ" }, { id: "customfield_10098", name: "Kênh tiếp nhận" },
];
