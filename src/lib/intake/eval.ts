import type { Analysis } from "@/lib/intake/analyze";
import type { EvalEmail } from "@/lib/intake/emails.fixture";

/** So kết quả phân tích với kỳ vọng của một email mẫu. Trả về danh sách điểm lệch, rỗng nghĩa là khớp. */
export function compareWithExpectation(expected: EvalEmail["expect"], analysis: Analysis): string[] {
  const { decision, signals, dates, incidentCode } = analysis;
  const problems: string[] = [];
  if (expected.kind !== "any" && decision.kind !== expected.kind) problems.push(`kết quả ${decision.kind}, mong đợi ${expected.kind}`);
  if (expected.abnormal !== undefined && signals.abnormal >= 0.5 !== expected.abnormal) problems.push(`cờ bất thường ${signals.abnormal.toFixed(2)}`);
  if (expected.start !== undefined && dates.start !== expected.start) problems.push(`ngày bắt đầu ${dates.start}`);
  if (expected.end !== undefined && dates.end !== expected.end) problems.push(`ngày kết thúc ${dates.end}`);
  if (expected.incidentCode !== undefined && incidentCode !== expected.incidentCode) problems.push(`mã sự cố ${incidentCode}`);
  if (decision.kind === "ask" && expected.missing && decision.missing.join() !== expected.missing.join()) {
    problems.push(`thiếu ${decision.missing.join(",")}, mong đợi ${expected.missing.join(",")}`);
  }
  if (decision.kind === "fill") {
    const { fields } = decision;
    if (expected.system !== undefined && `${fields.system} / ${fields.role}` !== expected.system) problems.push(`hệ thống ${fields.system} / ${fields.role}`);
    if (expected.environment !== undefined && fields.environment !== expected.environment) problems.push(`môi trường ${fields.environment}`);
    if (expected.requestKind !== undefined && fields.requestKind !== expected.requestKind) problems.push(`loại ${fields.requestKind}`);
    if (expected.priority !== undefined && fields.priority !== expected.priority) problems.push(`ưu tiên ${fields.priority}`);
  }
  return problems;
}
