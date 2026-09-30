import prisma from "@/lib/prisma";

/**
 * Switch, limits and prices for the lead Analysis button
 * (CRM_LEAD_ANALYSIS.md phase 5).
 */

/** Who may use it: nobody, Super Admins only (the Phase 6 trial), or everyone. */
export type AnalysisAccess = "off" | "admins" | "all";
export const ANALYSIS_ACCESS_KEY = "lead_analysis.access";
/** Until the sales team has checked the advice (Phase 6), admins only. */
export const DEFAULT_ANALYSIS_ACCESS: AnalysisAccess = "admins";

export async function getAnalysisAccess(): Promise<AnalysisAccess> {
  const row = await prisma.appSetting.findUnique({ where: { key: ANALYSIS_ACCESS_KEY } });
  const v = row?.value;
  return v === "off" || v === "admins" || v === "all" ? v : DEFAULT_ANALYSIS_ACCESS;
}

export const ANALYSIS_LIMITS = {
  /** Analyses one user may run per rolling hour. */
  perUserPerHour: 30,
  /** A lead re-run inside this window returns the saved result. */
  leadCooldownMs: 2 * 60_000,
};

/** Title of the activity-log line each run adds ("AI Analysis run by …"). */
export const ANALYSIS_ACTIVITY_TITLE = "AI Analysis";

/**
 * USD per million tokens, for the cost estimate in Settings → AI → Lead
 * Analysis. Approximate list prices — check your provider's price page and
 * edit here. Unknown models use the fallback.
 */
export const TOKEN_PRICES_USD_PER_MILLION: Record<string, { input: number; output: number }> = {
  "openai/gpt-oss-120b": { input: 0.15, output: 0.75 },
  "claude-haiku-4-5-20251001": { input: 1, output: 5 },
};
export const FALLBACK_PRICE_USD_PER_MILLION = { input: 1, output: 5 };

export function estimateCostUsd(model: string | null, inputTokens: number, outputTokens: number): number {
  const p = (model && TOKEN_PRICES_USD_PER_MILLION[model]) || FALLBACK_PRICE_USD_PER_MILLION;
  return (inputTokens * p.input + outputTokens * p.output) / 1_000_000;
}

/** Whether this role may use Analysis under the current switch. */
export function analysisAllowedFor(access: AnalysisAccess, role: string): boolean {
  return access === "all" || (access === "admins" && role === "SUPER_ADMIN");
}

/**
 * Whether this user may see (and so analyse) the lead: the lead page's own
 * rule — Super Admin sees every lead, everyone else only their own.
 */
export function canAnalyseLead(user: { id: string; role: string }, ownerId: string): boolean {
  return user.role === "SUPER_ADMIN" || ownerId === user.id;
}
