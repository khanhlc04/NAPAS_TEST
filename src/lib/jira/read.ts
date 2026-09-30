import type { Catalog, JiraCascadingOption } from "@/lib/intake/catalog";
import { parseCatalog } from "@/lib/intake/catalog";
import type { JiraHttp } from "@/lib/jira/http";
import { FIELD } from "@/lib/jira/names";

export interface IssueSnapshot {
  key: string;
  summary: string;
  description: string | null;
  status: string;
  reporter: { accountId: string; displayName: string };
  /** true khi trường "Hệ thống / Quyền" đã có giá trị. */
  systemFilled: boolean;
  channel: string | null;
}

export function createJiraReader({ call, fieldId }: JiraHttp) {
  return {
    async getIssue(key: string): Promise<IssueSnapshot> {
      const [systemId, channelId] = await Promise.all([fieldId(FIELD.system), fieldId(FIELD.channel)]);
      const data = await call(`/rest/api/2/issue/${key}?fields=summary,description,status,reporter,${systemId},${channelId}`);
      const fields = data.fields;
      return {
        key,
        summary: fields.summary ?? "",
        description: fields.description ?? null,
        status: fields.status.name,
        reporter: { accountId: fields.reporter.accountId, displayName: fields.reporter.displayName },
        systemFilled: Boolean(fields[systemId]),
        channel: fields[channelId]?.value ?? null,
      };
    },

    /** Bình luận công khai của chính người yêu cầu, theo thứ tự thời gian. */
    async getRequesterComments(key: string, reporterAccountId: string): Promise<string[]> {
      const data = await call(`/rest/servicedeskapi/request/${key}/comment?public=true&internal=false&limit=100`);
      const comments: { body: string; author: { accountId: string }; created?: { epochMillis: number } }[] = data.values ?? [];
      return comments
        .filter((comment) => comment.author.accountId === reporterAccountId)
        .sort((a, b) => (a.created?.epochMillis ?? 0) - (b.created?.epochMillis ?? 0))
        .map((comment) => comment.body);
    },

    /** Danh mục Hệ thống / Quyền lấy từ editmeta của chính yêu cầu, nên Hub không giữ bản riêng. */
    async getCatalog(key: string): Promise<Catalog> {
      const systemId = await fieldId(FIELD.system);
      const data = await call(`/rest/api/2/issue/${key}/editmeta`);
      const allowed: JiraCascadingOption[] = data.fields?.[systemId]?.allowedValues ?? [];
      return parseCatalog(allowed);
    },
  };
}
