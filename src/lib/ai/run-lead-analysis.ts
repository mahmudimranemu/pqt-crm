import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { generateWithTaskDetailed, type Completion } from "@/lib/ai/generate";
import { buildLeadSnapshot } from "@/lib/ai/lead-snapshot";
import { ANALYSIS_ACTIVITY_TITLE, ANALYSIS_LIMITS } from "@/lib/ai/lead-analysis-config";
import {
  LEAD_ANALYSIS_SYSTEM_PROMPT,
  leadAnalysisUserPrompt,
  parseLeadAnalysis,
  type LeadAnalysisResult,
} from "@/lib/ai/lead-analysis";

/**
 * Runs the lead Analysis (CRM_LEAD_ANALYSIS.md §3.4) and saves the result.
 * No auth here — the server action in lib/actions/lead-analysis.ts checks
 * who may run it; this is kept separate so it can be exercised directly.
 */

/** Same provider, model and key as "Generate WhatsApp" (spec decision 6). */
const TASK = "whatsapp_generation" as const;
const TIME_LIMIT_MS = 30_000;
const TEMPERATURE = 0.2;
// Room for reasoning models (e.g. Groq's gpt-oss), whose thinking counts
// against the cap; the answer itself is short.
const MAX_TOKENS = 4096;

export const TOO_SLOW = "Analysis took too long, please try again.";
export const BUSY =
  "The AI provider is busy right now (rate limit reached). Please try again in a minute.";
/** Wait this long at most when the provider asks us to slow down. */
const MAX_RATE_LIMIT_WAIT_MS = 10_000;
const BAD_ANSWER = "The AI's answer couldn't be used. Please try again.";
export const HOURLY_LIMIT = `You've run ${ANALYSIS_LIMITS.perUserPerHour} analyses in the last hour. Please wait a little before running another.`;
export const COOLDOWN =
  "This lead was analysed less than 2 minutes ago. Please wait a moment before running it again.";
export const RECENT_NOTICE = "Analysed less than 2 minutes ago — showing that result.";

type Generate = (system: string, user: string, signal: AbortSignal) => Promise<Completion>;

const defaultGenerate: Generate = (system, user, signal) =>
  generateWithTaskDetailed(TASK, system, user, {
    temperature: TEMPERATURE,
    maxTokens: MAX_TOKENS,
    signal,
  });

export type LeadAnalysisRun =
  | {
      ok: true;
      cached: boolean;
      analysisId: string;
      result: LeadAnalysisResult;
      createdAt: Date;
      model: string | null;
      /** Why a saved result was returned instead of a new one, if not obvious. */
      notice?: string;
    }
  | { ok: false; error: string; analysisId: string | null };

/**
 * "429 … Please try again in 1.725s" → 1725. Groq's free tier allows 8,000
 * tokens a minute for the whole account, and one analysis uses ~4,000.
 */
function rateLimitWaitMs(e: unknown): number | null {
  const message = e instanceof Error ? e.message : String(e);
  if (!/\b429\b|rate limit/i.test(message)) return null;
  const secs = /try again in ([\d.]+)\s*s/i.exec(message)?.[1];
  return secs ? Math.ceil(Number(secs) * 1000) + 250 : MAX_RATE_LIMIT_WAIT_MS;
}

function isTimeout(e: unknown): boolean {
  return e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError");
}

export async function runLeadAnalysis(args: {
  leadId: string;
  requestedById: string | null;
  /** First name for the "AI Analysis run by …" activity line. */
  requestedByName?: string;
  now?: Date;
  generate?: Generate;
}): Promise<LeadAnalysisRun> {
  const { leadId, requestedById, requestedByName, now = new Date(), generate = defaultGenerate } = args;

  // Same lead again within 2 minutes: the saved result, not a new run.
  const recent = await prisma.leadAnalysis.findFirst({
    where: { leadId, createdAt: { gte: new Date(now.getTime() - ANALYSIS_LIMITS.leadCooldownMs) } },
    orderBy: { createdAt: "desc" },
  });
  if (recent) {
    const lastGood = await prisma.leadAnalysis.findFirst({
      where: { leadId, status: "ok" },
      orderBy: { createdAt: "desc" },
    });
    if (!lastGood?.result) return { ok: false, error: COOLDOWN, analysisId: null };
    return {
      ok: true,
      cached: true,
      notice: RECENT_NOTICE,
      analysisId: lastGood.id,
      result: lastGood.result as unknown as LeadAnalysisResult,
      createdAt: lastGood.createdAt,
      model: lastGood.model,
    };
  }

  const { snapshot, dataAsOf, fingerprint } = await buildLeadSnapshot(leadId, now);

  // Nothing changed since the last good analysis: show it, don't pay again.
  const saved = await prisma.leadAnalysis.findFirst({
    where: { leadId, status: "ok", inputFingerprint: fingerprint },
    orderBy: { createdAt: "desc" },
  });
  if (saved?.result) {
    return {
      ok: true,
      cached: true,
      analysisId: saved.id,
      result: saved.result as unknown as LeadAnalysisResult,
      createdAt: saved.createdAt,
      model: saved.model,
    };
  }

  // Only real AI calls count towards the hourly limit (saved results are free).
  if (requestedById) {
    const lastHour = await prisma.leadAnalysis.count({
      where: { requestedById, createdAt: { gte: new Date(now.getTime() - 3_600_000) } },
    });
    if (lastHour >= ANALYSIS_LIMITS.perUserPerHour) {
      return { ok: false, error: HOURLY_LIMIT, analysisId: null };
    }
  }

  const user = leadAnalysisUserPrompt(snapshot);
  let inputTokens = 0;
  let outputTokens = 0;
  let model: string | null = null;
  let result: LeadAnalysisResult | null = null;
  let error = BAD_ANSWER;
  let reason = "";

  // One retry, and only for an answer that failed the checks. A short
  // "slow down" from the provider gets one quiet wait first.
  let waited = false;
  for (let attempt = 1; attempt <= 2 && !result; attempt += 1) {
    let completion: Completion;
    try {
      completion = await generate(
        LEAD_ANALYSIS_SYSTEM_PROMPT,
        user,
        AbortSignal.timeout(TIME_LIMIT_MS),
      );
    } catch (e) {
      const wait = rateLimitWaitMs(e);
      if (wait !== null && !waited && wait <= MAX_RATE_LIMIT_WAIT_MS) {
        waited = true;
        attempt -= 1; // the wait doesn't use up the retry
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }
      reason = e instanceof Error ? e.message.slice(0, 400) : String(e);
      error = isTimeout(e) ? TOO_SLOW : wait !== null ? BUSY : reason;
      break;
    }
    inputTokens += completion.inputTokens;
    outputTokens += completion.outputTokens;
    model = completion.model;
    const parsed = parseLeadAnalysis(completion.text, snapshot);
    if (parsed.ok) result = parsed.result;
    else reason = parsed.reason;
  }

  const row = await prisma.leadAnalysis.create({
    data: {
      leadId,
      requestedById,
      status: result ? "ok" : "failed",
      result: result ? (result as unknown as Prisma.InputJsonValue) : Prisma.DbNull,
      errorMessage: result ? null : reason.slice(0, 1000),
      dataAsOf,
      inputFingerprint: fingerprint,
      model,
      inputTokens,
      outputTokens,
    },
  });

  if (requestedById) {
    await prisma.activity.create({
      data: {
        type: "NOTE",
        title: ANALYSIS_ACTIVITY_TITLE,
        description: `AI Analysis run by ${requestedByName || "a user"}${result ? "" : " (failed)"}`,
        leadId,
        userId: requestedById,
      },
    });
  }

  if (!result) {
    console.error("lead analysis failed", { leadId, reason });
    return { ok: false, error, analysisId: row.id };
  }
  return {
    ok: true,
    cached: false,
    analysisId: row.id,
    result,
    createdAt: row.createdAt,
    model,
  };
}
