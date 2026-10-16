import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import type { z } from "zod";
import { automationSecret, qualifierActive, qualifierMode } from "./config";
import { verifySignature } from "./signature";
import { clientIp, takeRateLimit } from "./rate-limit";
import { qualifierAudit } from "./audit";

const MAX_BODY_BYTES = 256 * 1024;
const ACTOR = "automation";

export type AutomationContext = {
  req: NextRequest;
  url: URL;
  /** Parsed JSON body (POST) or undefined (GET). */
  body: unknown;
  /** "shadow" or "live" — the route only runs when the qualifier is active. */
  mode: "shadow" | "live";
};

export type AutomationResult = {
  status: number;
  body: unknown;
  /** What goes into qualifier_audit — ids and counts only, no personal data. */
  audit?: { enquiryId?: string | null; summary?: Prisma.InputJsonValue };
};

export function fail(status: number, code: string, message: string, details?: unknown): AutomationResult {
  return { status, body: { error: { code, message, ...(details ? { details } : {}) } } };
}

/** Validate input with zod; on failure the result is a 422 listing field paths
 *  and messages only (never the submitted values). */
export function validate<S extends z.ZodType>(
  schema: S,
  input: unknown,
): { ok: true; data: z.infer<S> } | { ok: false; result: AutomationResult } {
  const parsed = schema.safeParse(input);
  if (parsed.success) return { ok: true, data: parsed.data };
  const issues = parsed.error.issues.slice(0, 20).map((i) => ({
    path: i.path.join("."),
    message: i.message,
  }));
  return { ok: false, result: fail(422, "VALIDATION_FAILED", "Invalid input", issues) };
}

function json(status: number, body: unknown) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

/**
 * Wraps an /api/automation/* handler. Order of checks:
 *   1. rate limit (per IP)              → 429
 *   2. AUTOMATION_API_SECRET configured → 503 otherwise
 *   3. HMAC signature + timestamp       → 401
 *   4. QUALIFIER_ENABLED / QUALIFIER_MODE → 503 QUALIFIER_DISABLED, and
 *      nothing is read or written (not even the audit log)
 *   5. the handler; every call is logged in qualifier_audit
 */
export function automationRoute(handler: (ctx: AutomationContext) => Promise<AutomationResult>) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const url = req.nextUrl;
    const action = `${req.method} ${url.pathname.replace(/^\/api\/automation/, "")}`;
    const active = qualifierActive();

    if (!takeRateLimit(clientIp(req.headers))) {
      if (active) await qualifierAudit({ actor: ACTOR, action, outcome: "rejected", summary: { reason: "rate_limited" } });
      return json(429, { error: { code: "RATE_LIMITED", message: "Too many requests" } });
    }

    const secret = automationSecret();
    if (!secret) {
      return json(503, { error: { code: "NOT_CONFIGURED", message: "AUTOMATION_API_SECRET is not set" } });
    }

    const rawBody = await req.text();
    if (Buffer.byteLength(rawBody) > MAX_BODY_BYTES) {
      return json(413, { error: { code: "TOO_LARGE", message: "Request body too large" } });
    }

    const check = verifySignature({
      secret,
      timestamp: req.headers.get("x-pqt-timestamp"),
      signature: req.headers.get("x-pqt-signature"),
      method: req.method,
      pathWithQuery: url.pathname + url.search,
      rawBody,
    });
    if (!check.ok) {
      if (active) await qualifierAudit({ actor: ACTOR, action, outcome: "rejected", summary: { reason: check.reason } });
      return json(401, {
        error: {
          code: "UNAUTHORIZED",
          message: check.reason === "stale" ? "Timestamp outside the 5-minute window" : "Missing or invalid signature",
        },
      });
    }

    if (!active) {
      return json(503, { error: { code: "QUALIFIER_DISABLED", message: "The qualifier is switched off" } });
    }

    let body: unknown;
    if (req.method !== "GET" && rawBody) {
      try {
        body = JSON.parse(rawBody);
      } catch {
        await qualifierAudit({ actor: ACTOR, action, outcome: "rejected", summary: { reason: "invalid_json" } });
        return json(400, { error: { code: "INVALID_JSON", message: "Body is not valid JSON" } });
      }
    }

    try {
      const result = await handler({ req, url, body, mode: qualifierMode() as "shadow" | "live" });
      await qualifierAudit({
        actor: ACTOR,
        action,
        outcome: result.status >= 500 ? "error" : result.status >= 400 ? "rejected" : "ok",
        enquiryId: result.audit?.enquiryId,
        summary: { http: result.status, ...(result.audit?.summary as object | undefined) },
      });
      return json(result.status, result.body);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      console.error(`[qualifier] ${action} failed`, message);
      await qualifierAudit({ actor: ACTOR, action, outcome: "error", errorMessage: message });
      return json(500, { error: { code: "INTERNAL", message: "Something went wrong; it has been logged" } });
    }
  };
}
