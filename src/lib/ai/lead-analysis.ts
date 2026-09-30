import { z } from "zod";
import type { LeadSnapshot } from "@/lib/ai/lead-snapshot";
import {
  ALLOWED_PRIORITIES,
  ALLOWED_TEMPERATURES,
  FOLLOW_UP_PLAYBOOK,
} from "@/lib/ai/lead-analysis-playbook";

/**
 * The lead Analysis answer (CRM_LEAD_ANALYSIS.md §3): the prompt, the exact
 * shape the AI must return, and the checks that answer must pass before it
 * is saved or shown.
 */

const HEALTH_LABELS = ["hot", "warm", "cold", "paused", "lost"] as const;
const CHANNELS = ["call", "whatsapp", "email", "meeting"] as const;
const CONFIDENCE = ["low", "medium", "high"] as const;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

const text = z.string().trim().min(1);
const date = z.string().regex(DATE, "a YYYY-MM-DD date");

const AnalysisShape = z.object({
  health: z.object({ label: z.enum(HEALTH_LABELS), headline: text }),
  summary: text,
  next_action: z.object({
    what: text,
    channel: z.enum(CHANNELS),
    when: date,
    why: text,
    talking_points: z.array(text).default([]),
    based_on: z.array(z.string()).default([]),
  }),
  missing_info: z.array(z.object({ field: text, question: text })).default([]),
  data_issues: z.array(z.object({ issue: text, explanation: text })).default([]),
  risks: z.array(text).default([]),
  suggested_updates: z.array(z.unknown()).default([]),
  confidence: z.object({ level: z.enum(CONFIDENCE), reason: text }),
});

/** One-click changes — only these fields, only these values. */
const SuggestedUpdate = z.discriminatedUnion("field", [
  z.object({
    field: z.literal("temperature"),
    current: z.string().nullable().optional(),
    suggested: z.enum(ALLOWED_TEMPERATURES),
    reason: text,
  }),
  z.object({
    field: z.literal("priority"),
    current: z.string().nullable().optional(),
    suggested: z.enum(ALLOWED_PRIORITIES),
    reason: text,
  }),
  z.object({
    field: z.literal("next_call_date"),
    current: z.string().nullable().optional(),
    suggested: date,
    reason: text,
  }),
  z.object({
    field: z.literal("create_task"),
    title: text.max(200),
    due: date,
    reason: text,
  }),
]);

export type SuggestedUpdate = z.infer<typeof SuggestedUpdate>;
export type LeadAnalysisResult = Omit<z.infer<typeof AnalysisShape>, "suggested_updates"> & {
  suggested_updates: SuggestedUpdate[];
};

// --- prompt ------------------------------------------------------------------

export const LEAD_ANALYSIS_SYSTEM_PROMPT = `You analyse one sales lead for Property Quest Turkey (PQT), an Istanbul real-estate advisory, and tell the assigned agent what to do next.

You receive a JSON "lead snapshot". Everything you say must come from it.

Rules:
- Use only the snapshot. If something is not there (budget, property type, purpose, timeline, preferred area), say it is unknown and suggest asking. Never guess it.
- Every statement in "summary" and "next_action" must be supported by the notes, activities or fields, and "next_action.based_on" must list the note/activity IDs it rests on (e.g. ["N1", "A2"]).
- The facts block (today, day counts, contact counts, overdue flags) is calculated for you and is correct. Use it; do not recalculate dates. All dates you write are YYYY-MM-DD and not before facts.today.
- Respect what the client said. If they asked for time, are travelling or paused, do not recommend pushing — a light check-in at the right moment.
- Turkish citizenship: only say the client may be "eligible to apply". Never promise citizenship, approval or investment returns, and never state a programme threshold amount.
- Write for a busy sales agent: short, practical, plain English, no filler, no emojis. Notes may be in English, Bengali or Turkish; always answer in English.
- The client is always called "the client".
- The lead "score" is not reliable (the CRM rarely recalculates it). Never base a judgement or a suggested update on it.

PQT follow-up playbook:
${FOLLOW_UP_PLAYBOOK.map((l) => `- ${l}`).join("\n")}

Return ONE JSON object, no markdown, no commentary, exactly this shape:
{
  "health": { "label": "hot" | "warm" | "cold" | "paused" | "lost", "headline": "one sentence" },
  "summary": "2-3 sentences on where this lead stands",
  "next_action": {
    "what": "one clear action",
    "channel": "call" | "whatsapp" | "email" | "meeting",
    "when": "YYYY-MM-DD",
    "why": "one sentence",
    "talking_points": ["up to 3 short points"],
    "based_on": ["N1"]
  },
  "missing_info": [{ "field": "budget", "question": "a natural question the agent can ask" }],
  "data_issues": [{ "issue": "short name", "explanation": "plain explanation of what is wrong with the record" }],
  "risks": ["up to 3 short points"],
  "suggested_updates": [
    { "field": "temperature", "current": "value or null", "suggested": ${ALLOWED_TEMPERATURES.map((v) => `"${v}"`).join(" | ")}, "reason": "..." },
    { "field": "priority", "current": "value or null", "suggested": ${ALLOWED_PRIORITIES.map((v) => `"${v}"`).join(" | ")}, "reason": "..." },
    { "field": "next_call_date", "current": "YYYY-MM-DD or null", "suggested": "YYYY-MM-DD", "reason": "..." },
    { "field": "create_task", "title": "task title", "due": "YYYY-MM-DD", "reason": "..." }
  ],
  "confidence": { "level": "low" | "medium" | "high", "reason": "one sentence" }
}
Limits: missing_info up to 5, data_issues up to 5, risks up to 3, talking_points up to 3, suggested_updates up to 4 and only the four fields shown (never stage, owner or anything else). Empty lists are fine. With little history, confidence is low and you say so — do not invent a history.`;

/**
 * Problems with the lead record itself, found by code — the AI reports them
 * rather than having to spot them (it missed most of them on PQT-L-0256).
 */
export function recordChecks(s: LeadSnapshot): string[] {
  const checks: string[] = [];
  const { lead, facts } = s;
  if ((lead.priority === "High" || lead.priority === "Urgent") && !lead.score) {
    checks.push(
      `Priority is ${lead.priority} but the lead score is 0 — the score is out of date (the CRM rarely recalculates it), not a sign of low interest.`,
    );
  }
  if (!lead.temperature) checks.push("Temperature is not set.");
  if (!lead.estimatedValue) checks.push("Estimated value is not set.");
  if (facts.nextCallDateChangesTotal >= 3) {
    checks.push(
      `The next call date has been changed ${facts.nextCallDateChangesTotal} times (${facts.nextCallDateChangesLast7Days} in the last 7 days).`,
    );
  }
  if (facts.openTasks === 0) checks.push("There are no open tasks on this lead.");
  if (facts.overdueTasks > 0) checks.push(`${facts.overdueTasks} task(s) are overdue.`);
  if (facts.nextCallOverdue) checks.push(`The next call date (${facts.nextCallDate}) has passed.`);
  if (lead.stage === "NEW_ENQUIRY" && facts.timesReached > 0) {
    checks.push("Stage is still New Enquiry although the client has been spoken to.");
  }
  return checks;
}

export function leadAnalysisUserPrompt(snapshot: LeadSnapshot): string {
  const checks = recordChecks(snapshot);
  return [
    `Lead snapshot:\n${JSON.stringify(snapshot, null, 2)}`,
    checks.length
      ? `Record checks (found by code, all true — put each in data_issues, most important first, up to 5):\n${checks.map((c) => `- ${c}`).join("\n")}`
      : "Record checks: none found.",
  ].join("\n\n");
}

// --- checking the answer -----------------------------------------------------

/** Wording that turns "eligible to apply" into a promise. */
const PROMISES = [
  /guarantee[sd]?\s+(?:turkish\s+)?citizenship/i,
  /citizenship\s+(?:is\s+)?guaranteed/i,
  /(?:will|would)\s+(?:get|receive|obtain|be\s+granted)\s+(?:turkish\s+)?citizenship/i,
  /guaranteed\s+(?:returns?|approval|yield|profit)/i,
  /(?:returns?|yield|profit)\s+(?:is|are)\s+guaranteed/i,
];
const MONEY = /(?:\$|usd|eur|€|£)\s?\d|\d[\d,.]*\s?(?:k|m|usd|dollars?)\b/i;

function allText(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(allText);
  if (value && typeof value === "object") return Object.values(value).flatMap(allText);
  return [];
}

/** The JSON object in a reply, even if wrapped in a fence or a sentence. */
function jsonText(raw: string): string {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  return start !== -1 && end > start ? raw.slice(start, end + 1) : raw;
}

export type ParseOutcome =
  | { ok: true; result: LeadAnalysisResult }
  | { ok: false; reason: string };

/**
 * Parse and check an AI reply. Structure, compliance and dates must be right
 * or the reply is rejected (the caller retries once). Minor excess is trimmed
 * instead: lists over their limit are cut, note/activity IDs that don't exist
 * are dropped, and a suggested update for a field or value that isn't allowed
 * is dropped rather than shown.
 */
export function parseLeadAnalysis(raw: string, snapshot: LeadSnapshot): ParseOutcome {
  let data: unknown;
  try {
    data = JSON.parse(jsonText(raw));
  } catch {
    return { ok: false, reason: "The reply was not valid JSON." };
  }
  const parsed = AnalysisShape.safeParse(data);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      ok: false,
      reason: `The reply didn't match the expected shape (${first?.path.join(".") || "root"}: ${first?.message}).`,
    };
  }
  const a = parsed.data;
  const today = snapshot.facts.today;

  if (a.next_action.when < today) {
    return { ok: false, reason: `next_action.when (${a.next_action.when}) is before today.` };
  }

  const strings = allText(a);
  if (strings.some((s) => PROMISES.some((re) => re.test(s)))) {
    return { ok: false, reason: "The reply promised citizenship, approval or returns." };
  }
  if (strings.some((s) => /citizenship/i.test(s) && MONEY.test(s))) {
    return { ok: false, reason: "The reply quoted an amount next to citizenship." };
  }

  const knownIds = new Set([
    ...snapshot.notes.map((n) => n.id),
    ...snapshot.activities.map((x) => x.id),
  ]);

  const updates: SuggestedUpdate[] = [];
  for (const item of a.suggested_updates) {
    const u = SuggestedUpdate.safeParse(item);
    if (!u.success) continue;
    const v = u.data;
    if (v.field === "temperature" && v.suggested === snapshot.lead.temperature) continue;
    if (v.field === "priority" && v.suggested === snapshot.lead.priority) continue;
    if (v.field === "next_call_date" && (v.suggested < today || v.suggested === snapshot.facts.nextCallDate)) continue;
    if (v.field === "create_task" && v.due < today) continue;
    updates.push(v);
  }

  return {
    ok: true,
    result: {
      ...a,
      next_action: {
        ...a.next_action,
        talking_points: a.next_action.talking_points.slice(0, 3),
        based_on: a.next_action.based_on.filter((id) => knownIds.has(id)),
      },
      missing_info: a.missing_info.slice(0, 5),
      data_issues: a.data_issues.slice(0, 5),
      risks: a.risks.slice(0, 3),
      suggested_updates: updates.slice(0, 4),
    },
  };
}
