export interface DateRange {
  /** Ngày bắt đầu dạng YYYY-MM-DD, hoặc null nếu không bóc được. */
  start: string | null;
  /** Ngày kết thúc dạng YYYY-MM-DD, hoặc null nếu không bóc được. */
  end: string | null;
  /** false khi có cả hai ngày mà ngày kết thúc đứng trước ngày bắt đầu. */
  valid: boolean;
}

interface Ymd {
  y: number;
  m: number;
  d: number;
}

type Hit =
  | { kind: "date"; pos: number; day: number; month: number; year: number | null }
  | { kind: "relative"; pos: number; ymd: Ymd }
  | { kind: "end_of_year"; pos: number }
  | { kind: "duration"; pos: number; amount: number; unit: "ngay" | "tuan" | "thang" };

const DAY_MS = 86_400_000;
const pad = (n: number) => String(n).padStart(2, "0");
const format = (v: Ymd) => `${v.y}-${pad(v.m)}-${pad(v.d)}`;
const parseIso = (iso: string): Ymd => {
  const [y, m, d] = iso.split("-").map(Number);
  return { y, m, d };
};
const toMs = (v: Ymd) => Date.UTC(v.y, v.m - 1, v.d);
const fromMs = (ms: number): Ymd => {
  const date = new Date(ms);
  return { y: date.getUTCFullYear(), m: date.getUTCMonth() + 1, d: date.getUTCDate() };
};
const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();
const isReal = (v: Ymd) => v.m >= 1 && v.m <= 12 && v.d >= 1 && v.d <= daysInMonth(v.y, v.m);
const before = (a: Ymd, b: Ymd) => toMs(a) < toMs(b);
const addDays = (v: Ymd, n: number) => fromMs(toMs(v) + n * DAY_MS);
function addMonths(v: Ymd, n: number): Ymd {
  const index = v.y * 12 + (v.m - 1) + n;
  const y = Math.floor(index / 12);
  const m = (index % 12) + 1;
  return { y, m, d: Math.min(v.d, daysInMonth(y, m)) };
}

/** Bỏ dấu và hạ chữ thường để bắt được cả email viết không dấu: "Từ thứ Hai" thành "tu thu hai". */
const fold = (text: string) =>
  text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d").toLowerCase().replace(/\s+/g, " ");

/** Ngày hôm nay theo múi giờ Việt Nam, dạng YYYY-MM-DD. */
export function todayInVn(now: Date = new Date(), timeZone = "Asia/Ho_Chi_Minh"): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

const WEEKDAY_OFFSET: Record<string, number> = {
  "thu hai": 0, "thu ba": 1, "thu tu": 2, "thu nam": 3, "thu sau": 4, "thu bay": 5, "chu nhat": 6,
};

function weekdayInWeek(today: Ymd, weekday: string, week: string): Ymd {
  const sinceMonday = (new Date(toMs(today)).getUTCDay() + 6) % 7;
  const thisMonday = addDays(today, -sinceMonday);
  const weekStart = week === "tuan nay" ? thisMonday : addDays(thisMonday, 7);
  return addDays(weekStart, WEEKDAY_OFFSET[weekday]);
}

const fullYear = (raw: string) => (raw.length === 2 ? 2000 + Number(raw) : Number(raw));
const END_CUE = /\b(?:den|toi|het|cho den)(?: ngay)? *$/;

/**
 * Bóc ngày bắt đầu và kết thúc từ văn bản tiếng Việt (có dấu hoặc không dấu).
 * Nhận dạng: dd/mm, dd/mm/yyyy, "ngày 5 tháng 10", "hôm nay", "ngày mai",
 * "thứ Hai tuần sau", "hết năm", và khoảng "N ngày/tuần/tháng" tính từ ngày bắt đầu.
 * Ngày không ghi năm lấy năm hiện tại, nếu đã qua thì lấy năm sau. Ngày kết thúc không ghi năm
 * lấy cùng năm với ngày bắt đầu. Khoảng "N đơn vị" cho ngày kết thúc = ngày bắt đầu + N.
 */
export function parseDateRange(text: string, today: string): DateRange {
  const t = parseIso(today);
  const original = fold(text);
  let rest = original;
  const hits: Hit[] = [];

  const scan = (pattern: RegExp, make: (m: RegExpExecArray) => Hit | null) => {
    for (const m of rest.matchAll(pattern)) {
      const hit = make(m);
      if (!hit) continue;
      hits.push(hit);
      rest = rest.slice(0, m.index) + " ".repeat(m[0].length) + rest.slice(m.index + m[0].length);
    }
  };
  const dateHit = (m: RegExpExecArray, day: number, month: number, year: number | null): Hit | null =>
    isReal({ y: year ?? 2000, m: month, d: day }) ? { kind: "date", pos: m.index, day, month, year } : null;

  scan(/\b(\d{4})-(\d{2})-(\d{2})\b/g, (m) => dateHit(m, Number(m[3]), Number(m[2]), Number(m[1])));
  scan(/(?:\bngay )?\b(\d{1,2}) thang (\d{1,2})(?: nam (\d{4}))?\b/g, (m) =>
    dateHit(m, Number(m[1]), Number(m[2]), m[3] ? Number(m[3]) : null));
  scan(/\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{4}|\d{2})\b/g, (m) => dateHit(m, Number(m[1]), Number(m[2]), fullYear(m[3])));
  scan(/\b(?!24\/7\b)(\d{1,2})\/(\d{1,2})\b(?!\/)/g, (m) => dateHit(m, Number(m[1]), Number(m[2]), null));
  scan(/\b(het|cuoi) nam\b/g, (m) => ({ kind: "end_of_year", pos: m.index }));
  scan(/\bhom nay\b/g, (m) => ({ kind: "relative", pos: m.index, ymd: t }));
  scan(/\bngay mai\b/g, (m) => ({ kind: "relative", pos: m.index, ymd: addDays(t, 1) }));
  scan(/\b(thu hai|thu ba|thu tu|thu nam|thu sau|thu bay|chu nhat) (tuan nay|tuan sau|tuan toi)\b/g, (m) =>
    ({ kind: "relative", pos: m.index, ymd: weekdayInWeek(t, m[1], m[2]) }));
  scan(/\b(\d{1,3}) (ngay|tuan|thang)\b/g, (m) =>
    ({ kind: "duration", pos: m.index, amount: Number(m[1]), unit: m[2] as "ngay" | "tuan" | "thang" }));

  hits.sort((a, b) => a.pos - b.pos);
  const cuedAsEnd = (pos: number) => END_CUE.test(original.slice(Math.max(0, pos - 16), pos));

  let startHit: Hit | undefined;
  let endHit: Hit | undefined;
  for (const hit of hits) {
    if (hit.kind === "duration") continue;
    if (hit.kind === "end_of_year" || cuedAsEnd(hit.pos)) {
      endHit ??= hit;
    } else if (!startHit) {
      startHit = hit;
    } else {
      endHit ??= hit;
    }
  }

  let start: Ymd | null = null;
  if (startHit?.kind === "relative") start = startHit.ymd;
  if (startHit?.kind === "date") {
    const candidate = { y: startHit.year ?? t.y, m: startHit.month, d: startHit.day };
    const rolled = startHit.year === null && before(candidate, t) ? { ...candidate, y: candidate.y + 1 } : candidate;
    start = isReal(rolled) ? rolled : null;
  }

  const endYear = start?.y ?? t.y;
  let end: Ymd | null = null;
  if (endHit?.kind === "end_of_year") end = { y: endYear, m: 12, d: 31 };
  if (endHit?.kind === "relative") end = endHit.ymd;
  if (endHit?.kind === "date") {
    const candidate = { y: endHit.year ?? endYear, m: endHit.month, d: endHit.day };
    end = isReal(candidate) ? candidate : null;
  }
  const duration = hits.find((hit) => hit.kind === "duration");
  if (!end && start && duration?.kind === "duration") {
    end = duration.unit === "thang" ? addMonths(start, duration.amount) : addDays(start, duration.amount * (duration.unit === "tuan" ? 7 : 1));
  }

  return {
    start: start ? format(start) : null,
    end: end ? format(end) : null,
    valid: !(start && end && before(end, start)),
  };
}
