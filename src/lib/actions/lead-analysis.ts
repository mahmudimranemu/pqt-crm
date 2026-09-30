"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { auth, type ExtendedSession } from "@/lib/auth";
import { updateLeadField } from "@/lib/actions/leads";
import { createTaskAction } from "@/lib/actions/tasks";
import { runLeadAnalysis } from "@/lib/ai/run-lead-analysis";
import type { LeadAnalysisResult } from "@/lib/ai/lead-analysis";
import {
  ANALYSIS_ACCESS_KEY,
  ANALYSIS_ACTIVITY_TITLE,
  analysisAllowedFor,
  canAnalyseLead,
  estimateCostUsd,
  getAnalysisAccess,
  type AnalysisAccess,
} from "@/lib/ai/lead-analysis-config";

/**
 * Server actions for the lead Analysis button. Who may run it follows the
 * lead page itself: Super Admin, or the lead's owner (approved default for
 * the spec's view_own / view_all). Applying a suggestion also needs the
 * lead-edit rule updateLeadField uses: no viewers, and agents only on their
 * own leads.
 */

const AI_NOTE = "(suggested by AI Analysis)";
const MAX_NOTES = 30;
const MAX_ACTIVITIES = 30;

export interface LeadAnalysisView {
  id: string;
  createdAt: string;
  requestedBy: string | null;
  result: LeadAnalysisResult;
  /** Indexes into result.suggested_updates already applied. */
  applied: number[];
}

export interface LeadAnalysisState {
  analysis: LeadAnalysisView | null;
  /** Newer notes/activity than the analysis used. */
  newActivity: boolean;
  counts: { notes: number; activities: number };
  canApply: boolean;
}

type Session = ExtendedSession & { user: NonNullable<ExtendedSession["user"]> };

/** Checked on every request: the admin switch, then access to the lead. */
async function requireLeadAccess(leadId: string) {
  const session = (await auth()) as Session | null;
  if (!session?.user) throw new Error("Unauthorized");
  if (!analysisAllowedFor(await getAnalysisAccess(), session.user.role)) {
    throw new Error("AI Analysis is turned off.");
  }
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: { id: true, ownerId: true },
  });
  if (!lead) throw new Error("Lead not found");
  if (!canAnalyseLead(session.user, lead.ownerId)) {
    throw new Error("You don't have access to this lead.");
  }
  return { session, lead };
}

function canEdit(session: Session, ownerId: string): boolean {
  if (session.user.role === "VIEWER") return false;
  if (session.user.role === "SALES_AGENT") return ownerId === session.user.id;
  return true;
}

type StoredResult = LeadAnalysisResult & { applied?: number[] };

async function toView(row: {
  id: string;
  createdAt: Date;
  result: Prisma.JsonValue;
  requestedBy: { firstName: string } | null;
}): Promise<LeadAnalysisView> {
  const stored = row.result as unknown as StoredResult;
  const { applied = [], ...result } = stored;
  return {
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    requestedBy: row.requestedBy?.firstName ?? null,
    result,
    applied,
  };
}

/** A saved result the panel can draw — a bad row must not break the lead page. */
function looksComplete(result: Prisma.JsonValue): boolean {
  const r = result as Partial<LeadAnalysisResult> | null;
  return Boolean(r?.health?.label && r?.next_action?.what && Array.isArray(r?.suggested_updates));
}

async function newestActivityAt(leadId: string): Promise<Date | null> {
  const [note, activity] = await Promise.all([
    prisma.leadNote.findFirst({ where: { leadId }, orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
    // Changes made by applying a suggestion aren't news to the analysis —
    // counting them showed "New activity… run again" right after Apply.
    prisma.activity.findFirst({
      where: {
        leadId,
        title: { not: ANALYSIS_ACTIVITY_TITLE },
        NOT: { description: { endsWith: AI_NOTE } },
      },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
  ]);
  const dates = [note?.createdAt, activity?.createdAt].filter((d): d is Date => Boolean(d));
  return dates.length ? dates.reduce((a, b) => (a > b ? a : b)) : null;
}

/** The latest good analysis for the lead page, and what the panel needs. */
export async function getLeadAnalysisState(leadId: string): Promise<LeadAnalysisState> {
  const { session, lead } = await requireLeadAccess(leadId);
  const [row, notes, activities, newest] = await Promise.all([
    prisma.leadAnalysis.findFirst({
      where: { leadId, status: "ok" },
      orderBy: { createdAt: "desc" },
      include: { requestedBy: { select: { firstName: true } } },
    }),
    prisma.leadNote.count({ where: { leadId } }),
    prisma.activity.count({ where: { leadId } }),
    newestActivityAt(leadId),
  ]);
  return {
    analysis: row?.result && looksComplete(row.result) ? await toView(row) : null,
    newActivity: Boolean(row?.dataAsOf && newest && newest > row.dataAsOf),
    counts: { notes: Math.min(notes, MAX_NOTES), activities: Math.min(activities, MAX_ACTIVITIES) },
    canApply: canEdit(session, lead.ownerId),
  };
}

export async function analyseLead(
  leadId: string,
): Promise<
  | { ok: true; state: LeadAnalysisState; cached: boolean; notice?: string }
  | { ok: false; error: string }
> {
  try {
    const { session } = await requireLeadAccess(leadId);
    const run = await runLeadAnalysis({
      leadId,
      requestedById: session.user.id,
      requestedByName: session.user.firstName,
    });
    if (!run.ok) return { ok: false, error: run.error };
    return {
      ok: true,
      cached: run.cached,
      notice: run.notice,
      state: await getLeadAnalysisState(leadId),
    };
  } catch (e) {
    console.error("analyseLead failed:", e);
    return { ok: false, error: e instanceof Error ? e.message.slice(0, 400) : "Analysis failed." };
  }
}

function dayLabel(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Apply one suggested update, through the same update paths the lead page
 * uses, and log it with "(suggested by AI Analysis)". Each suggestion can be
 * applied once.
 */
export async function applyAnalysisSuggestion(
  analysisId: string,
  index: number,
): Promise<{ ok: true; state: LeadAnalysisState } | { ok: false; error: string }> {
  try {
    const row = await prisma.leadAnalysis.findUnique({ where: { id: analysisId } });
    if (!row?.result || row.status !== "ok") throw new Error("Analysis not found");
    const { session, lead } = await requireLeadAccess(row.leadId);
    if (!canEdit(session, lead.ownerId)) throw new Error("You can't edit this lead.");

    const stored = row.result as unknown as StoredResult;
    const applied = stored.applied ?? [];
    const update = stored.suggested_updates[index];
    if (!update) throw new Error("Suggestion not found");
    if (applied.includes(index)) throw new Error("Already applied");

    if (update.field === "temperature" || update.field === "priority") {
      await updateLeadField(lead.id, update.field, update.suggested);
      const label = update.field === "temperature" ? "Temperature" : "Priority";
      await prisma.activity.create({
        data: {
          type: "NOTE",
          title: `${label} Updated`,
          description: `${label} set to ${update.suggested} ${AI_NOTE}`,
          leadId: lead.id,
          userId: session.user.id,
        },
      });
    } else if (update.field === "next_call_date") {
      await updateLeadField(lead.id, "nextCallDate", update.suggested, { activityNote: AI_NOTE });
    } else {
      await createTaskAction({
        title: update.title,
        description: update.reason,
        dueDate: update.due,
        leadId: lead.id,
        assigneeId: lead.ownerId,
      });
      await prisma.activity.create({
        data: {
          type: "FOLLOW_UP",
          title: "Task Created",
          description: `Task "${update.title}" due ${dayLabel(update.due)} ${AI_NOTE}`,
          leadId: lead.id,
          userId: session.user.id,
        },
      });
    }

    await prisma.leadAnalysis.update({
      where: { id: analysisId },
      data: { result: { ...stored, applied: [...applied, index] } as unknown as Prisma.InputJsonValue },
    });
    revalidatePath(`/leads/${lead.id}`);
    return { ok: true, state: await getLeadAnalysisState(lead.id) };
  } catch (e) {
    console.error("applyAnalysisSuggestion failed:", e);
    return { ok: false, error: e instanceof Error ? e.message.slice(0, 300) : "Couldn't apply it." };
  }
}

// --- admin: switch and usage ---------------------------------------------------

async function requireSuperAdmin() {
  const session = (await auth()) as Session | null;
  if (!session?.user || session.user.role !== "SUPER_ADMIN") throw new Error("Unauthorized");
  return session;
}

export async function setAnalysisAccess(access: AnalysisAccess): Promise<{ ok: true }> {
  const session = await requireSuperAdmin();
  if (!["off", "admins", "all"].includes(access)) throw new Error("Unknown setting");
  await prisma.appSetting.upsert({
    where: { key: ANALYSIS_ACCESS_KEY },
    create: { key: ANALYSIS_ACCESS_KEY, value: access, updatedById: session.user.id },
    update: { value: access, updatedById: session.user.id },
  });
  revalidatePath("/settings/ai/lead-analysis");
  return { ok: true };
}

export interface LeadAnalysisUsage {
  access: AnalysisAccess;
  month: { runs: number; failed: number; inputTokens: number; outputTokens: number; costUsd: number };
  byDay: { day: string; runs: number; failed: number; tokens: number; costUsd: number }[];
  byUser: { name: string; runs: number; tokens: number; costUsd: number }[];
}

/** This month's analyses: per day, per user, tokens and estimated cost. */
export async function getLeadAnalysisUsage(now: Date = new Date()): Promise<LeadAnalysisUsage> {
  await requireSuperAdmin();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const rows = await prisma.leadAnalysis.findMany({
    where: { createdAt: { gte: monthStart } },
    select: {
      createdAt: true,
      status: true,
      model: true,
      inputTokens: true,
      outputTokens: true,
      requestedBy: { select: { firstName: true, lastName: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const month = { runs: 0, failed: 0, inputTokens: 0, outputTokens: 0, costUsd: 0 };
  const days = new Map<string, LeadAnalysisUsage["byDay"][number]>();
  const users = new Map<string, LeadAnalysisUsage["byUser"][number]>();
  const dayOf = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" });

  for (const r of rows) {
    const cost = estimateCostUsd(r.model, r.inputTokens, r.outputTokens);
    const tokens = r.inputTokens + r.outputTokens;
    const failed = r.status === "failed" ? 1 : 0;
    month.runs += 1;
    month.failed += failed;
    month.inputTokens += r.inputTokens;
    month.outputTokens += r.outputTokens;
    month.costUsd += cost;

    const day = dayOf.format(r.createdAt);
    const d = days.get(day) ?? { day, runs: 0, failed: 0, tokens: 0, costUsd: 0 };
    d.runs += 1;
    d.failed += failed;
    d.tokens += tokens;
    d.costUsd += cost;
    days.set(day, d);

    const name = r.requestedBy
      ? `${r.requestedBy.firstName} ${r.requestedBy.lastName}`.trim()
      : "Deleted user";
    const u = users.get(name) ?? { name, runs: 0, tokens: 0, costUsd: 0 };
    u.runs += 1;
    u.tokens += tokens;
    u.costUsd += cost;
    users.set(name, u);
  }

  return {
    access: await getAnalysisAccess(),
    month,
    byDay: [...days.values()],
    byUser: [...users.values()].sort((a, b) => b.runs - a.runs),
  };
}
