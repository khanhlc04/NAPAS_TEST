import type { Classifier } from "@/lib/ai/jev";
import type { Catalog } from "@/lib/intake/catalog";
import { cleanEmail } from "@/lib/intake/clean-email";
import { parseDateRange, type DateRange } from "@/lib/intake/dates";
import { decide, type Decision, type Signals, type Thresholds } from "@/lib/intake/decide";
import { findIncidentCode } from "@/lib/intake/incident";

export interface AnalyzeInput {
  subject: string;
  body: string;
  comments: string[];
  catalog: Catalog;
  classifier: Classifier;
  /** Ngày hôm nay theo múi giờ Việt Nam, dạng YYYY-MM-DD. */
  today: string;
  thresholds?: Thresholds;
}

export interface Analysis {
  decision: Decision;
  signals: Signals;
  dates: DateRange;
  incidentCode: string | null;
}

/** Làm sạch email, để code bóc ngày và mã sự cố, gọi Jev một lần, rồi quyết định điền hay hỏi lại. */
export async function analyze(input: AnalyzeInput): Promise<Analysis> {
  const body = cleanEmail(input.body);
  const comments = input.comments.map(cleanEmail).filter((comment) => comment.length > 0);
  const fullText = [input.subject, body, ...comments].join("\n");

  const dates = parseDateRange(fullText, input.today);
  const incidentCode = findIncidentCode(fullText);
  const signals = await input.classifier.classify({
    state: { tieu_de: input.subject, noi_dung: body, binh_luan_bo_sung: comments },
    catalog: input.catalog,
  });
  const decision = decide({
    signals,
    dates,
    incidentCode,
    reason: [body, ...comments].join("\n\n"),
    catalog: input.catalog,
    thresholds: input.thresholds,
  });
  return { decision, signals, dates, incidentCode };
}
