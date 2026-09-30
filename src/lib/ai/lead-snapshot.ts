import { createHash } from "crypto";
import prisma from "@/lib/prisma";
import { fetchProperties } from "@/lib/api/external-properties";

/**
 * The "lead snapshot" for the lead Analysis button (CRM_LEAD_ANALYSIS.md,
 * phase 2): everything the CRM knows about one lead, as a clean, safe packet
 * for the AI.
 *
 * Safe means: no phone numbers, no email addresses, and the client's name
 * replaced with "the client" everywhere — including inside note text. Dates
 * are worked out here, in the CRM's time zone, and handed to the AI as facts
 * (models are bad at date arithmetic).
 */

/** "Today" and every day count in the analysis use this zone. */
export const CRM_TIME_ZONE = "Europe/Istanbul";

const MAX_NOTES = 30;
const MAX_ACTIVITIES = 30;
const MAX_NOTE_CHARS = 1500;
const OPEN_TASK_STATUSES = ["TODO", "IN_PROGRESS"] as const;

type ContactType = "CALL" | "EMAIL" | "SPOKEN" | "NOTE";

export interface LeadSnapshot {
  facts: {
    today: string;
    daysSinceCreated: number;
    contactAttempts: number;
    timesReached: number;
    daysSinceLastContactAttempt: number | null;
    daysSinceLastReached: number | null;
    nextCallDate: string | null;
    daysUntilNextCall: number | null;
    nextCallOverdue: boolean;
    nextCallDateChangesLast7Days: number;
    openTasks: number;
    overdueTasks: number;
  };
  lead: {
    reference: string;
    stage: string;
    segment: string | null;
    priority: string | null;
    temperature: string | null;
    snooze: string | null;
    score: number | null;
    estimatedValue: string | null;
    source: string;
    called: boolean;
    spoken: boolean;
    assignedAgent: string;
    clientCountry: string | null;
    tags: string[];
  };
  notes: { id: string; type: ContactType; author: string; date: string; text: string }[];
  activities: { id: string; type: string; title: string; description: string | null; date: string }[];
  openTasks: { title: string; due: string | null; overdue: boolean }[];
  interestedProperties: {
    name: string;
    district: string | null;
    startingPrice: string | null;
    status: string | null;
  }[];
}

export interface LeadSnapshotResult {
  snapshot: LeadSnapshot;
  /** Newest note/activity in the input — for the "new activity since" banner. */
  dataAsOf: Date;
  /** Hash of the snapshot: an identical re-run can reuse the saved result. */
  fingerprint: string;
  /** For "Reading 3 notes and 9 activities…". */
  counts: { notes: number; activities: number };
}

// --- dates ---------------------------------------------------------------

const dayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: CRM_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** YYYY-MM-DD of the calendar day `d` falls on in the CRM time zone. */
export function crmDay(d: Date): string {
  return dayFormatter.format(d);
}

/** Whole calendar days from `from` to `to` (both YYYY-MM-DD). */
function daysBetween(from: string, to: string): number {
  const ms = Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}

// --- notes -----------------------------------------------------------------

/** The Contact Log type lives in a text prefix: "[CALL] …", "[SPOKEN] …". */
export function parseNote(content: string): { type: ContactType; text: string } {
  const m = /^\s*\[(CALL|EMAIL|SPOKEN)\]\s*/.exec(content);
  if (!m) return { type: "NOTE", text: content.trim() };
  return { type: m[1] as ContactType, text: content.slice(m[0].length).trim() };
}

// --- redaction ---------------------------------------------------------------

const EMAIL_RE = /[\p{L}\p{N}._%+-]+@[\p{L}\p{N}-]+(?:\.[\p{L}\p{N}-]+)+/gu;
// A run of digits with the usual separators; replaced only when it has 7+
// digits, so dates ("30/09") and prices ("$400,000" has 6) survive.
const PHONE_RE = /\+?\(?\d[\d\s().\-/]{5,}\d/g;

const TITLES = "Mr|Mrs|Ms|Miss|Mx|Dr|Sir|Madam";

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Removes contact details and the client's name from free text.
 *
 * The full name goes first ("M H Chowdhury"), then each part of three or more
 * letters on its own ("Chowdhury"); shorter parts ("M", "H") would clobber
 * ordinary words, so they are only removed as part of the full name.
 */
export function makeRedactor(nameParts: (string | null | undefined)[]) {
  const parts = nameParts.map((p) => (p ?? "").trim()).filter(Boolean);
  const full = parts.join(" ").replace(/\s+/g, " ");
  const words = [...new Set(parts.flatMap((p) => p.split(/\s+/)))].filter(
    (w) => [...w].length >= 3,
  );
  const patterns = [full, ...words]
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)
    // A title in front goes too: "Mr Chowdhury" → "the client", not "Mr the client".
    .map(
      (n) =>
        new RegExp(
          `(?<![\\p{L}\\p{N}])(?:(?:${TITLES})\\.?\\s+)?${escapeRegExp(n)}(?![\\p{L}\\p{N}])`,
          "giu",
        ),
    );

  return (text: string | null | undefined): string => {
    let out = (text ?? "").replace(EMAIL_RE, "[email removed]");
    out = out.replace(PHONE_RE, (m) =>
      (m.match(/\d/g) ?? []).length >= 7 ? "[phone removed]" : m,
    );
    for (const re of patterns) out = out.replace(re, "the client");
    return out;
  };
}

function clip(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function firstName(u: { firstName: string | null } | null | undefined): string {
  return (u?.firstName ?? "").trim().split(/\s+/)[0] || "Unknown";
}

// --- the snapshot ------------------------------------------------------------

export async function buildLeadSnapshot(
  leadId: string,
  now: Date = new Date(),
): Promise<LeadSnapshotResult> {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      client: { select: { firstName: true, lastName: true, country: true } },
      owner: { select: { firstName: true } },
      interestedProperty: {
        select: { name: true, district: true, priceFrom: true, status: true },
      },
      notes: {
        orderBy: { createdAt: "desc" },
        include: { agent: { select: { firstName: true } } },
      },
      activities: { orderBy: { createdAt: "desc" }, take: 200 },
      tasks: {
        where: { status: { in: [...OPEN_TASK_STATUSES] } },
        orderBy: { dueDate: "asc" },
        select: { title: true, dueDate: true },
      },
    },
  });
  if (!lead) throw new Error("Lead not found");

  const redact = makeRedactor([lead.client.firstName, lead.client.lastName]);
  const today = crmDay(now);
  const daysAgo = (d: Date) => Math.max(0, daysBetween(crmDay(d), today));

  // Contact counts use the whole log, not just the newest 30 notes.
  const parsed = lead.notes.map((n) => ({ note: n, ...parseNote(n.content) }));
  const attempts = parsed.filter((p) => p.type !== "NOTE");
  const reached = parsed.filter((p) => p.type === "SPOKEN");

  const nextCall = lead.nextCallDate ? crmDay(lead.nextCallDate) : null;
  const daysUntilNextCall = nextCall ? daysBetween(today, nextCall) : null;

  const weekAgo = now.getTime() - 7 * 86_400_000;
  const nextCallChanges = lead.activities.filter(
    (a) => a.title === "Next Call Date Updated" && a.createdAt.getTime() >= weekAgo,
  ).length;

  const openTasks = lead.tasks.map((t) => ({
    title: clip(redact(t.title), 200),
    due: t.dueDate ? crmDay(t.dueDate) : null,
    overdue: t.dueDate ? t.dueDate.getTime() < now.getTime() : false,
  }));

  const snapshot: LeadSnapshot = {
    facts: {
      today,
      daysSinceCreated: daysAgo(lead.createdAt),
      contactAttempts: attempts.length,
      timesReached: reached.length,
      daysSinceLastContactAttempt: attempts[0] ? daysAgo(attempts[0].note.createdAt) : null,
      daysSinceLastReached: reached[0] ? daysAgo(reached[0].note.createdAt) : null,
      nextCallDate: nextCall,
      daysUntilNextCall,
      nextCallOverdue: daysUntilNextCall !== null && daysUntilNextCall < 0,
      nextCallDateChangesLast7Days: nextCallChanges,
      openTasks: openTasks.length,
      overdueTasks: openTasks.filter((t) => t.overdue).length,
    },
    lead: {
      reference: lead.leadNumber,
      stage: lead.stage,
      segment: lead.segment,
      priority: lead.priority,
      temperature: lead.temperature || null,
      snooze: lead.snooze,
      score: lead.score,
      estimatedValue: lead.estimatedValue ? `${lead.estimatedValue} ${lead.currency}` : null,
      source: lead.source,
      called: lead.called,
      spoken: lead.spoken,
      assignedAgent: firstName(lead.owner),
      clientCountry: lead.client.country || null,
      tags: lead.tags.map((t) => redact(t)),
    },
    notes: parsed.slice(0, MAX_NOTES).map((p, i) => ({
      id: `N${i + 1}`,
      type: p.type,
      author: firstName(p.note.agent),
      date: crmDay(p.note.createdAt),
      text: clip(redact(p.text), MAX_NOTE_CHARS),
    })),
    activities: lead.activities.slice(0, MAX_ACTIVITIES).map((a, i) => ({
      id: `A${i + 1}`,
      type: a.type,
      title: redact(a.title),
      description: a.description ? clip(redact(a.description), 300) : null,
      date: crmDay(a.createdAt),
    })),
    openTasks,
    interestedProperties: await interestedProperties(lead),
  };

  const newest = [lead.notes[0]?.createdAt, lead.activities[0]?.createdAt, lead.createdAt]
    .filter((d): d is Date => Boolean(d))
    .reduce((a, b) => (a > b ? a : b));

  return {
    snapshot,
    dataAsOf: newest,
    fingerprint: createHash("sha256").update(JSON.stringify(snapshot)).digest("hex"),
    counts: {
      notes: snapshot.notes.length,
      activities: snapshot.activities.length,
    },
  };
}

/**
 * Name, district, starting price and status — never cost prices or internal
 * notes. PMS-linked properties are fetched from the same feed the lead page
 * uses; the legacy local link is read directly.
 */
async function interestedProperties(lead: {
  interestedPropertyRefs: string[];
  currency: string;
  interestedProperty: {
    name: string;
    district: string | null;
    priceFrom: unknown;
    status: string;
  } | null;
}): Promise<LeadSnapshot["interestedProperties"]> {
  const out: LeadSnapshot["interestedProperties"] = [];
  if (lead.interestedPropertyRefs.length) {
    try {
      const refs = new Set(lead.interestedPropertyRefs);
      for (const p of await fetchProperties()) {
        if (!refs.has(p.id) && !refs.has(p.reference)) continue;
        out.push({
          name: p.name,
          district: p.district || null,
          startingPrice: p.price ? `${p.price} ${p.currency}` : null,
          status: p.status || null,
        });
      }
    } catch {
      // The property feed being down must not break the analysis.
    }
  }
  const legacy = lead.interestedProperty;
  if (legacy && !out.some((p) => p.name === legacy.name)) {
    out.push({
      name: legacy.name,
      district: legacy.district ? String(legacy.district) : null,
      startingPrice: legacy.priceFrom ? `${String(legacy.priceFrom)} ${lead.currency}` : null,
      status: legacy.status,
    });
  }
  return out;
}
