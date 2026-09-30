import type { FilledFields } from "@/lib/intake/decide";
import type { JiraHttp } from "@/lib/jira/http";
import { FIELD } from "@/lib/jira/names";

export function createJiraWriter({ call, fieldId }: JiraHttp) {
  return {
    /** Điền các trường mà AI đã trích xuất. Trường 2 tầng gửi dạng {value, child}. */
    async fillFields(key: string, fields: FilledFields): Promise<void> {
      const [system, environment, requestKind, startDate, endDate, incident, reason] = await Promise.all(
        [FIELD.system, FIELD.environment, FIELD.requestKind, FIELD.startDate, FIELD.endDate, FIELD.incident, FIELD.reason].map(fieldId),
      );
      await call(`/rest/api/2/issue/${key}`, {
        method: "PUT",
        body: {
          fields: {
            [system]: { value: fields.system, child: { value: fields.role } },
            [environment]: { value: fields.environment },
            [requestKind]: { value: fields.requestKind },
            [startDate]: fields.startDate,
            [endDate]: fields.endDate,
            [reason]: fields.reason,
            ...(fields.incidentCode ? { [incident]: fields.incidentCode } : {}),
            priority: { name: fields.priority },
          },
        },
      });
    },

    async addComment(key: string, body: string, isPublic: boolean): Promise<void> {
      await call(`/rest/servicedeskapi/request/${key}/comment`, { method: "POST", body: { body, public: isPublic } });
    },

    /** Chuyển trạng thái bằng cách tra id transition theo tên, vì id khác nhau giữa các site. */
    async transition(key: string, name: string): Promise<void> {
      const data = await call(`/rest/api/2/issue/${key}/transitions`);
      const found = (data.transitions as { id: string; name: string }[]).find((item) => item.name === name);
      if (!found) throw new Error(`Yêu cầu ${key} không có transition "${name}" ở trạng thái hiện tại`);
      await call(`/rest/api/3/issue/${key}/transitions`, { method: "POST", body: { transition: { id: found.id } } });
    },
  };
}
