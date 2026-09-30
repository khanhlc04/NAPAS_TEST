import { describe, expect, it } from "vitest";
import { cleanEmail } from "@/lib/intake/clean-email";
import { parseDateRange } from "@/lib/intake/dates";
import { EVAL_EMAILS, EVAL_TODAY } from "@/lib/intake/emails.fixture";
import { findIncidentCode } from "@/lib/intake/incident";

describe("bộ 10 email mẫu: phần code tự làm (không cần Jev)", () => {
  it("có đúng 10 email với mã không trùng", () => {
    expect(EVAL_EMAILS).toHaveLength(10);
    expect(new Set(EVAL_EMAILS.map((email) => email.id)).size).toBe(10);
  });

  for (const email of EVAL_EMAILS.filter((item) => item.expect.start)) {
    it(`email ${email.id} (${email.title}): bóc đúng ngày`, () => {
      const dates = parseDateRange([email.subject, cleanEmail(email.body)].join("\n"), EVAL_TODAY);
      expect({ start: dates.start, end: dates.end }).toEqual({ start: email.expect.start, end: email.expect.end });
    });
  }

  it("email 09: bóc đúng mã sự cố; các email khác không có mã", () => {
    for (const email of EVAL_EMAILS) {
      expect(findIncidentCode(`${email.subject}\n${email.body}`)).toBe(email.expect.incidentCode ?? null);
    }
  });
});
