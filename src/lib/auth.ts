import { timingSafeEqual } from "node:crypto";

/** So khớp header `x-hub-secret` với secret, không để lộ độ dài khớp qua thời gian xử lý. */
export function isAuthorized(request: Request, secret: string): boolean {
  const given = request.headers.get("x-hub-secret");
  if (!given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}
