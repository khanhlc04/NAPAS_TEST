import { createHash } from "node:crypto";
import type { Classifier } from "@/lib/ai/jev";
import { analyze } from "@/lib/intake/analyze";
import { todayInVn } from "@/lib/intake/dates";
import { DEFAULT_THRESHOLDS, type FilledFields, type Signals, type Thresholds } from "@/lib/intake/decide";
import { buildFollowUp } from "@/lib/intake/questions";
import type { JiraPort } from "@/lib/jira/client";
import { STATUS_NEW, TRANSITION_NEED_INFO } from "@/lib/jira/names";
import type { ExtractionRecord, ExtractionStore, Outcome } from "@/lib/store/extractions";

export interface IntakeDeps {
  jira: JiraPort;
  classifier: Classifier;
  store: ExtractionStore;
  now: () => Date;
  timeZone?: string;
  thresholds?: Thresholds;
}

export type IntakeResult =
  | { outcome: "skipped"; reason: "not_new" | "already_filled" | "duplicate" }
  | { outcome: Outcome; reason?: string };

const percent = (value: number) => value.toFixed(2).replace(".", ",");

export function formatFillComment(fields: FilledFields, signals: Signals, warnings: string[]): string {
  return [
    `AI (Jev ${signals.model}) đã điền yêu cầu từ email:`,
    `- Hệ thống / Quyền: ${fields.system} / ${fields.role} (độ tin cậy ${percent(signals.system.confidence)})`,
    `- Môi trường: ${fields.environment} (${percent(signals.environment.confidence)})`,
    `- Loại yêu cầu: ${fields.requestKind}`,
    `- Mức ưu tiên: ${fields.priority}`,
    `- Thời gian: ${fields.startDate} đến ${fields.endDate}`,
    `- Mã sự cố: ${fields.incidentCode ?? "không có"}`,
    ...(warnings.length > 0 ? ["Lưu ý:", ...warnings.map((warning) => `- ${warning}`)] : []),
    "Người duyệt vẫn kiểm tra. AI không có quyền duyệt.",
  ].join("\n");
}

const hashInput = (parts: string[]) => createHash("sha256").update(parts.join("\u0000")).digest("hex");

/**
 * Đọc email của một yêu cầu, rồi điền trường hoặc hỏi lại người gửi.
 * Lỗi đọc Jira ban đầu được ném ra ngoài. Mọi lỗi sau đó được ghi lại và ticket giữ ở "Mới"
 * cho Service Desk xử lý tay, nên yêu cầu không bao giờ bị mất.
 */
export async function runIntake(issueKey: string, deps: IntakeDeps): Promise<IntakeResult> {
  const { jira, store } = deps;
  const thresholds = deps.thresholds ?? DEFAULT_THRESHOLDS;

  const issue = await jira.getIssue(issueKey);
  if (issue.status !== STATUS_NEW) return { outcome: "skipped", reason: "not_new" };
  if (issue.systemFilled) return { outcome: "skipped", reason: "already_filled" };

  const comments = await jira.getRequesterComments(issueKey, issue.reporter.accountId);
  const inputHash = hashInput([issue.summary, issue.description ?? "", ...comments]);
  if (await store.hasProcessed(issueKey, inputHash)) return { outcome: "skipped", reason: "duplicate" };

  const history = await store.history(issueKey);
  const startedAt = deps.now().getTime();
  const record: Omit<ExtractionRecord, "latencyMs"> = {
    issueKey, attempt: history.attempts + 1, inputHash, model: "", output: null,
    confidence: null, outcome: "failed", missingFields: [], error: null,
  };
  let result: IntakeResult;

  try {
    const catalog = await jira.getCatalog(issueKey);
    const { decision, signals, dates, incidentCode } = await analyze({
      subject: issue.summary, body: issue.description ?? "", comments, catalog,
      classifier: deps.classifier, today: todayInVn(deps.now(), deps.timeZone), thresholds,
    });
    record.model = signals.model;
    record.output = { signals, dates, incidentCode, decision: decision.kind };

    if (decision.kind === "fill") {
      await jira.fillFields(issueKey, decision.fields);
      await jira.addComment(issueKey, formatFillComment(decision.fields, signals, decision.warnings), false);
      record.outcome = "filled";
      record.confidence = decision.confidence;
    } else {
      if (decision.warnings.length > 0) {
        await jira.addComment(issueKey, ["AI cảnh báo:", ...decision.warnings.map((warning) => `- ${warning}`)].join("\n"), false);
      }
      if (decision.kind === "not_request") {
        await jira.addComment(
          issueKey,
          `AI: Không phải yêu cầu cấp quyền (xác suất ${percent(signals.isRequest)}). Yêu cầu ở lại hàng đợi Cần phân loại để Service Desk xử lý.`,
          false,
        );
        record.outcome = "not_request";
      } else {
        record.missingFields = decision.missing;
        if (history.asks >= thresholds.maxAsks) throw new Error(`Đã hỏi lại ${thresholds.maxAsks} lần mà vẫn thiếu thông tin`);
        await jira.addComment(issueKey, buildFollowUp({ name: issue.reporter.displayName, missing: decision.missing, catalog }), true);
        await jira.transition(issueKey, TRANSITION_NEED_INFO);
        record.outcome = "asked";
      }
    }
    result = { outcome: record.outcome };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    record.outcome = "failed";
    record.error = message;
    await jira.addComment(issueKey, `AI: Cần phân loại tay. Lý do: ${message}`, false).catch(() => undefined);
    result = { outcome: "failed", reason: message };
  }

  try {
    await store.save({ ...record, latencyMs: deps.now().getTime() - startedAt });
  } catch (error) {
    console.error("Không ghi được nhật ký ai_extractions", error);
  }
  return result;
}
