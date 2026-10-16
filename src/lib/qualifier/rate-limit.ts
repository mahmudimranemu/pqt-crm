/**
 * Small in-memory rate limit for /api/automation/*: N requests per minute
 * per client IP. The CRM runs as one container on Coolify, so per-process
 * memory is enough; it resets on restart, which is fine for this purpose.
 */

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 120;

const hits = new Map<string, { count: number; resetAt: number }>();

export function clientIp(headers: Headers): string {
  const fwd = headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return headers.get("x-real-ip")?.trim() || "unknown";
}

/** Returns true if the request is allowed. */
export function takeRateLimit(key: string, now = Date.now()): boolean {
  const entry = hits.get(key);
  if (!entry || entry.resetAt <= now) {
    hits.set(key, { count: 1, resetAt: now + WINDOW_MS });
    if (hits.size > 1000) {
      for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
    }
    return true;
  }
  entry.count += 1;
  return entry.count <= MAX_PER_WINDOW;
}
