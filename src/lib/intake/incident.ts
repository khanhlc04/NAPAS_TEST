const INCIDENT = /\b(INC|SC)[-_ ]?(\d[\d-]{2,})\b/i;

/** Tìm mã sự cố dạng INC-2026-0042 hoặc SC 4521. Trả về dạng chuẩn hóa "INC-2026-0042". */
export function findIncidentCode(text: string): string | null {
  const match = INCIDENT.exec(text);
  return match ? `${match[1].toUpperCase()}-${match[2]}` : null;
}
