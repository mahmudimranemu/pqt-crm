/**
 * Inquiry Qualifier switches (PQT_LEAD_QUALIFIER_AGENT_SPEC.md §0.8).
 *
 *   QUALIFIER_ENABLED=true        instant kill switch — anything else = off
 *   QUALIFIER_MODE=off|shadow|live
 *       off     nothing runs (default)
 *       shadow  scores/suggestions are saved; nothing is ever assigned
 *       live    decisions may assign (not available yet — see decisions route)
 *   QUALIFIER_START_DATE=2026-11-01T00:00:00+03:00
 *       enquiries older than this are never processed automatically
 *   AUTOMATION_API_SECRET         HMAC secret shared with n8n (openssl rand -hex 64)
 */

export type QualifierMode = "off" | "shadow" | "live";

export function qualifierEnabled(): boolean {
  return process.env.QUALIFIER_ENABLED === "true";
}

export function qualifierMode(): QualifierMode {
  const m = process.env.QUALIFIER_MODE;
  return m === "shadow" || m === "live" ? m : "off";
}

/** True only when the kill switch is on AND the mode isn't "off". */
export function qualifierActive(): boolean {
  return qualifierEnabled() && qualifierMode() !== "off";
}

export function qualifierStartDate(): Date | null {
  const raw = process.env.QUALIFIER_START_DATE;
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function automationSecret(): string | null {
  const s = process.env.AUTOMATION_API_SECRET;
  // A short secret is a misconfiguration; refuse rather than accept it.
  return s && s.length >= 32 ? s : null;
}

/** Istanbul is UTC+3 all year (no DST since 2016). */
const ISTANBUL_OFFSET = "+03:00";

/** [start, end) of a YYYY-MM-DD day in Istanbul time, or null if invalid. */
export function istanbulDayRange(date: string): { start: Date; end: Date } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const start = new Date(`${date}T00:00:00${ISTANBUL_OFFSET}`);
  if (Number.isNaN(start.getTime())) return null;
  // Reject impossible dates like 2026-02-31 that JS rolls forward.
  if (start.toLocaleDateString("en-CA", { timeZone: "Europe/Istanbul" }) !== date) return null;
  return { start, end: new Date(start.getTime() + 86_400_000) };
}
