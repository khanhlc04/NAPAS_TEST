const QUOTE_HEADERS = [
  /^\s*on .{5,200} wrote:\s*$/i,
  /^\s*vào .{5,200} đã viết:\s*$/i,
  /^\s*(on|vào) .{5,200}<\s*$/i,
  /(wrote|đã viết):\s*$/i,
  /^\s*-{2,}\s*(original message|forwarded message|thư gốc)\s*-{2,}\s*$/i,
  /^\s*_{5,}\s*$/,
];

const SIGNATURE_STARTS = [
  /^\s*--\s*$/,
  /^\s*(trân trọng|best regards|kind regards|regards)[,.!]?\s*$/i,
  /^\s*(sent from my|gửi từ)\b/i,
];

/**
 * Giữ lại phần người viết tự gõ: bỏ thư cũ được trích dẫn, chữ ký và khối {quote} của Jira.
 * Dừng ở dòng tiêu đề trích dẫn hoặc dòng bắt đầu chữ ký đầu tiên.
 */
export function cleanEmail(raw: string): string {
  const text = raw
    .normalize("NFC")
    .replace(/\r\n?/g, "\n")
    .replace(/\{quote\}[\s\S]*?\{quote\}/g, "");

  const kept: string[] = [];
  for (const line of text.split("\n")) {
    if (QUOTE_HEADERS.some((pattern) => pattern.test(line))) break;
    if (SIGNATURE_STARTS.some((pattern) => pattern.test(line))) break;
    if (/^\s*>/.test(line)) continue;
    kept.push(line.trimEnd());
  }
  return kept.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
