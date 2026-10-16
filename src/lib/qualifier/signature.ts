import crypto from "crypto";

/**
 * Signed-request check for /api/automation/*.
 *
 * Same idea as the PMS→CRM users webhook (HMAC-SHA256 + timestamp, 5-minute
 * window, constant-time compare), but the timestamp, method and path are
 * part of what is signed — so a captured request can't be replayed with a
 * fresh timestamp or pointed at another endpoint.
 *
 *   X-PQT-Timestamp: unix seconds
 *   X-PQT-Signature: sha256=<hex HMAC-SHA256 of the string below>
 *
 *   `${timestamp}.${METHOD}.${pathWithQuery}.${rawBody}`
 *
 * e.g. "1760600000.GET./api/automation/agents." (GET has an empty body).
 */

export const REPLAY_WINDOW_SECONDS = 300;

export function signaturePayload(
  timestamp: string,
  method: string,
  pathWithQuery: string,
  rawBody: string,
): string {
  return `${timestamp}.${method.toUpperCase()}.${pathWithQuery}.${rawBody}`;
}

export function sign(secret: string, payload: string): string {
  return "sha256=" + crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

function constantTimeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

export type SignatureCheck =
  | { ok: true }
  | { ok: false; reason: "missing" | "stale" | "invalid" };

export function verifySignature(opts: {
  secret: string;
  timestamp: string | null;
  signature: string | null;
  method: string;
  pathWithQuery: string;
  rawBody: string;
  nowSeconds?: number;
}): SignatureCheck {
  const { secret, timestamp, signature } = opts;
  if (!timestamp || !signature) return { ok: false, reason: "missing" };
  if (!/^\d{1,12}$/.test(timestamp)) return { ok: false, reason: "invalid" };

  const now = opts.nowSeconds ?? Math.floor(Date.now() / 1000);
  if (Math.abs(now - Number(timestamp)) > REPLAY_WINDOW_SECONDS) {
    return { ok: false, reason: "stale" };
  }

  const expected = sign(
    secret,
    signaturePayload(timestamp, opts.method, opts.pathWithQuery, opts.rawBody),
  );
  return constantTimeEqual(expected, signature.trim())
    ? { ok: true }
    : { ok: false, reason: "invalid" };
}
