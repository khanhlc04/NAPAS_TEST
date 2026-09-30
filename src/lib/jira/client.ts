import type { Catalog } from "@/lib/intake/catalog";
import type { FilledFields } from "@/lib/intake/decide";
import { createJiraHttp, type JiraConfig } from "@/lib/jira/http";
import { createJiraReader, type IssueSnapshot } from "@/lib/jira/read";
import { createJiraWriter } from "@/lib/jira/write";

/** Phần của Jira mà luồng email-intake dùng. Kiểm thử thay bằng bản giả. */
export interface JiraPort {
  getIssue(key: string): Promise<IssueSnapshot>;
  getRequesterComments(key: string, reporterAccountId: string): Promise<string[]>;
  getCatalog(key: string): Promise<Catalog>;
  fillFields(key: string, fields: FilledFields): Promise<void>;
  addComment(key: string, body: string, isPublic: boolean): Promise<void>;
  transition(key: string, name: string): Promise<void>;
}

export function createJiraClient(config: JiraConfig): JiraPort {
  const http = createJiraHttp(config);
  return { ...createJiraReader(http), ...createJiraWriter(http) };
}
