export interface JiraConfig {
  baseUrl: string;
  email: string;
  apiToken: string;
  fetchImpl?: typeof fetch;
}

export class JiraError extends Error {
  constructor(message: string, readonly status: number, readonly body: string) {
    super(message);
    this.name = "JiraError";
  }
}

export interface JiraHttp {
  /** Gọi REST của Jira, trả về JSON (hoặc null nếu không có nội dung). Ném JiraError khi không thành công. */
  call(path: string, init?: { method?: string; body?: unknown }): Promise<any>;
  /** Tra id trường (dạng customfield_10088) theo tên hiển thị. Tra một lần rồi nhớ lại. */
  fieldId(name: string): Promise<string>;
}

export function createJiraHttp(config: JiraConfig): JiraHttp {
  const doFetch = config.fetchImpl ?? fetch;
  const authorization = `Basic ${Buffer.from(`${config.email}:${config.apiToken}`).toString("base64")}`;
  let fieldIds: Promise<Map<string, string>> | undefined;

  async function call(path: string, init: { method?: string; body?: unknown } = {}): Promise<any> {
    const method = init.method ?? "GET";
    const response = await doFetch(`${config.baseUrl}${path}`, {
      method,
      headers: {
        Authorization: authorization,
        Accept: "application/json",
        ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
    const text = await response.text();
    if (!response.ok) throw new JiraError(`Jira ${response.status} ${method} ${path}`, response.status, text.slice(0, 500));
    return text ? JSON.parse(text) : null;
  }

  /** Lưu chính Promise để hai lần tra đồng thời chỉ gọi Jira một lần. */
  function loadFieldIds(): Promise<Map<string, string>> {
    fieldIds ??= call("/rest/api/2/field")
      .then((fields: { id: string; name: string }[]) => {
        const byName = new Map<string, string>();
        for (const field of fields) if (!byName.has(field.name)) byName.set(field.name, field.id);
        return byName;
      })
      .catch((error) => {
        fieldIds = undefined; // lần sau thử lại, không nhớ lỗi
        throw error;
      });
    return fieldIds;
  }

  async function fieldId(name: string): Promise<string> {
    const id = (await loadFieldIds()).get(name);
    if (!id) throw new Error(`Không tìm thấy trường Jira tên "${name}"`);
    return id;
  }

  return { call, fieldId };
}
