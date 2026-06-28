"use server";

import { generateWithTask } from "@/lib/ai/generate";
import prisma from "@/lib/prisma";
import { auth, type ExtendedSession } from "@/lib/auth";

async function requireExec() {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");
  if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "ADMIN") {
    throw new Error("Forbidden");
  }
}

/* Executive dashboard aggregates — live data for the CEO/Super-Admin overview.
 * Shapes mirror the placeholder constants in the dashboard component so the
 * client can drop them in directly. "Won" = COMPLETED sales. */

const WON = "COMPLETED" as const;

type MetricTotals = {
  enquiries: number;
  leads: number;
  clients: number;
  bookings: number;
  sales: number;
  revenue: number;
};

const titleCase = (s: string) =>
  s
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

async function totalsForWindow(gte: Date, lt: Date): Promise<MetricTotals> {
  const where = { createdAt: { gte, lt } };
  const [enquiries, leads, clients, bookings, saleAgg] = await Promise.all([
    prisma.enquiry.count({ where }),
    prisma.lead.count({ where }),
    prisma.client.count({ where }),
    prisma.booking.count({ where }),
    prisma.sale.aggregate({
      where: { status: WON, createdAt: { gte, lt } },
      _count: { _all: true },
      _sum: { salePrice: true },
    }),
  ]);
  return {
    enquiries,
    leads,
    clients,
    bookings,
    sales: saleAgg._count._all,
    revenue: Number(saleAgg._sum.salePrice ?? 0),
  };
}

const pctChange = (cur: number, prev: number) =>
  prev > 0 ? Math.round(((cur - prev) / prev) * 1000) / 10 : 0;

function buildDataset(cur: MetricTotals, prev: MetricTotals) {
  const conv = cur.enquiries ? (cur.leads / cur.enquiries) * 100 : 0;
  const convPrev = prev.enquiries ? (prev.leads / prev.enquiries) * 100 : 0;
  return {
    enquiries: { v: cur.enquiries, d: pctChange(cur.enquiries, prev.enquiries) },
    leads: { v: cur.leads, d: pctChange(cur.leads, prev.leads) },
    clients: { v: cur.clients, d: pctChange(cur.clients, prev.clients) },
    conv: { v: Math.round(conv * 10) / 10, d: Math.round((conv - convPrev) * 10) / 10 },
    bookings: { v: cur.bookings, d: pctChange(cur.bookings, prev.bookings) },
    revenue: { v: cur.revenue, d: pctChange(cur.revenue, prev.revenue) },
    sales: cur.sales,
  };
}

// Map ActivityType → the dashboard's call/email/spoken/note buckets.
const ACT_BUCKET: Record<string, "call" | "email" | "spoken" | "note"> = {
  CALL: "call",
  EMAIL: "email",
  MEETING: "spoken",
  SITE_VISIT: "spoken",
  NOTE: "note",
  FOLLOW_UP: "note",
  STAGE_CHANGE: "note",
  DOCUMENT_UPLOAD: "note",
  PAYMENT_RECEIVED: "note",
  TASK_COMPLETED: "note",
};

/** Per-agent daily activity log (real `Activity` rows) for the team-activity
 *  table and the chat's "last N days of <agent>". Day index 0 = today.
 *  Returned shape matches the dashboard's genAgentDays output. */
async function buildActivityDays(days = 30) {
  const now = new Date();
  const startMidnight = new Date(now);
  startMidnight.setHours(0, 0, 0, 0);
  const since = new Date(startMidnight.getTime() - (days - 1) * 86_400_000);

  const users = await prisma.user.findMany({
    where: { isActive: true, role: { in: ["SALES_AGENT", "SALES_MANAGER"] } },
    select: { id: true, firstName: true, lastName: true, role: true },
  });
  const ids = users.map((u) => u.id);
  const acts = await prisma.activity.findMany({
    where: {
      createdAt: { gte: since },
      // Owned-by OR performed-by a sales user (covers actions taken by a manager
      // on another agent's record — we attribute those to the record's owner).
      OR: [
        { lead: { ownerId: { in: ids } } },
        { enquiry: { assignedAgentId: { in: ids } } },
        { client: { assignedAgentId: { in: ids } } },
        { userId: { in: ids } },
      ],
    },
    orderBy: { createdAt: "asc" },
    select: {
      userId: true,
      type: true,
      title: true,
      description: true,
      createdAt: true,
      lead: { select: { title: true, ownerId: true } },
      client: { select: { firstName: true, lastName: true, assignedAgentId: true } },
      enquiry: { select: { firstName: true, lastName: true, assignedAgentId: true } },
    },
  });

  const dayIndex = (d: Date) => {
    const m = new Date(d);
    m.setHours(0, 0, 0, 0);
    return Math.round((startMidnight.getTime() - m.getTime()) / 86_400_000);
  };
  const contactName = (a: (typeof acts)[number]) => {
    if (a.client) return `${a.client.firstName} ${a.client.lastName}`.trim();
    if (a.lead) return a.lead.title;
    if (a.enquiry) return `${a.enquiry.firstName} ${a.enquiry.lastName}`.trim();
    return "";
  };

  // Attribute each activity to the agent who OWNS the related record (their book
  // of business), not whoever performed the action — so a manager's bulk actions
  // on other agents' leads don't flood the manager's timeline.
  const ownerId = (a: (typeof acts)[number]) =>
    a.lead?.ownerId ??
    a.enquiry?.assignedAgentId ??
    a.client?.assignedAgentId ??
    a.userId;

  const byAgent = new Map<string, typeof acts>();
  for (const a of acts) {
    const oid = ownerId(a);
    const arr = byAgent.get(oid) ?? [];
    arr.push(a);
    byAgent.set(oid, arr);
  }

  const result = users.map((u) => {
    const blank = () => ({ call: 0, email: 0, spoken: 0, note: 0 });
    const dayObjs = Array.from({ length: days }, (_, i) => ({
      date: new Date(startMidnight.getTime() - i * 86_400_000),
      started: null as Date | null,
      counts: blank(),
      entries: [] as { time: Date; type: string; text: string; client: string }[],
    }));
    for (const a of byAgent.get(u.id) ?? []) {
      const idx = dayIndex(a.createdAt);
      if (idx < 0 || idx >= days) continue;
      const day = dayObjs[idx];
      const bucket = ACT_BUCKET[a.type] ?? "note";
      day.counts[bucket] += 1;
      if (!day.started || a.createdAt < day.started) day.started = a.createdAt;
      if (day.entries.length < 8) {
        day.entries.push({
          time: a.createdAt,
          type: bucket,
          text: a.title || a.description || bucket,
          client: contactName(a),
        });
      }
    }
    return {
      name: `${u.firstName} ${u.lastName}`.trim().toUpperCase(),
      role: titleCase(u.role),
      days: dayObjs,
    };
  });

  // Surface agents with real activity first; keep all so the team list isn't empty.
  return result.sort(
    (a, b) =>
      b.days.reduce((s, d) => s + d.entries.length, 0) -
      a.days.reduce((s, d) => s + d.entries.length, 0),
  );
}

function mapCount<T extends { _count?: { _all: number } }>(
  rows: T[],
  key: keyof T,
) {
  const m = new Map<string, number>();
  for (const r of rows) {
    const id = r[key] as unknown as string | null;
    if (id) m.set(id, r._count?._all ?? 0);
  }
  return m;
}

type AgentUser = {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
};

/** Per-agent leaderboard aggregates for an arbitrary window. Returns only
 *  agents with some activity, sorted by leads+clients. */
async function agentsForWindow(agentUsers: AgentUser[], gte: Date, lt: Date) {
  const win = { gte, lt };
  const [enqByAgent, leadByOwner, clientByAgent, actByUser, saleByAgent] =
    await Promise.all([
      prisma.enquiry.groupBy({
        by: ["assignedAgentId"],
        where: { createdAt: win, assignedAgentId: { not: null } },
        _count: { _all: true },
      }),
      prisma.lead.groupBy({
        by: ["ownerId"],
        where: { createdAt: win },
        _count: { _all: true },
      }),
      prisma.client.groupBy({
        by: ["assignedAgentId"],
        where: { createdAt: win, assignedAgentId: { not: null } },
        _count: { _all: true },
      }),
      prisma.activity.groupBy({
        by: ["userId"],
        where: { createdAt: win },
        _count: { _all: true },
      }),
      prisma.sale.groupBy({
        by: ["agentId"],
        where: { status: WON, createdAt: win },
        _sum: { salePrice: true },
      }),
    ]);
  const enqM = mapCount(enqByAgent, "assignedAgentId");
  const leadM = mapCount(leadByOwner, "ownerId");
  const clientM = mapCount(clientByAgent, "assignedAgentId");
  const actM = mapCount(actByUser, "userId");
  const revM = new Map<string, number>();
  for (const r of saleByAgent) revM.set(r.agentId, Number(r._sum.salePrice ?? 0));

  return agentUsers
    .map((u) => ({
      name: `${u.firstName} ${u.lastName}`.trim().toUpperCase(),
      role: titleCase(u.role),
      enq: enqM.get(u.id) ?? 0,
      leads: leadM.get(u.id) ?? 0,
      clients: clientM.get(u.id) ?? 0,
      activity: actM.get(u.id) ?? 0,
      rev: revM.get(u.id) ?? 0,
    }))
    .filter((a) => a.enq || a.leads || a.clients || a.activity || a.rev)
    .sort((a, b) => b.leads + b.clients - (a.leads + a.clients));
}

/** Real daily time-series for the trend chart + KPI sparklines. One row per
 *  day (oldest→newest) carrying every KPI we can bucket by createdAt. */
async function buildSeries(days = 90) {
  const now = new Date();
  const startMidnight = new Date(now);
  startMidnight.setHours(0, 0, 0, 0);
  const since = new Date(startMidnight.getTime() - (days - 1) * 86_400_000);
  const win = { gte: since };

  const [enq, leads, clients, bookings, sales] = await Promise.all([
    prisma.enquiry.findMany({ where: { createdAt: win }, select: { createdAt: true } }),
    prisma.lead.findMany({ where: { createdAt: win }, select: { createdAt: true } }),
    prisma.client.findMany({ where: { createdAt: win }, select: { createdAt: true } }),
    prisma.booking.findMany({ where: { createdAt: win }, select: { createdAt: true } }),
    prisma.sale.findMany({
      where: { status: WON, createdAt: win },
      select: { createdAt: true, salePrice: true },
    }),
  ]);

  const idxOf = (d: Date) => {
    const m = new Date(d);
    m.setHours(0, 0, 0, 0);
    return Math.round((m.getTime() - since.getTime()) / 86_400_000);
  };
  const buckets = Array.from({ length: days }, (_, i) => ({
    date: new Date(since.getTime() + i * 86_400_000),
    enquiries: 0,
    leads: 0,
    clients: 0,
    bookings: 0,
    revenue: 0,
  }));
  const tally = (
    rows: { createdAt: Date }[],
    field: "enquiries" | "leads" | "clients" | "bookings",
  ) => {
    for (const r of rows) {
      const i = idxOf(r.createdAt);
      if (i >= 0 && i < days) buckets[i][field] += 1;
    }
  };
  tally(enq, "enquiries");
  tally(leads, "leads");
  tally(clients, "clients");
  tally(bookings, "bookings");
  for (const s of sales) {
    const i = idxOf(s.createdAt);
    if (i >= 0 && i < days) buckets[i].revenue += Number(s.salePrice ?? 0);
  }
  return buckets;
}

export async function getExecutiveData() {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");
  if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "ADMIN") {
    throw new Error("Forbidden");
  }

  const now = new Date();
  const dayMs = 86_400_000;
  const at = (daysAgo: number) => new Date(now.getTime() - daysAgo * dayMs);

  // --- KPI datasets (7d / 30d / 90d), each with delta vs the prior window ---
  const [d7, p7, d30, p30, d90, p90] = await Promise.all([
    totalsForWindow(at(7), now),
    totalsForWindow(at(14), at(7)),
    totalsForWindow(at(30), now),
    totalsForWindow(at(60), at(30)),
    totalsForWindow(at(90), now),
    totalsForWindow(at(180), at(90)),
  ]);
  const datasets = {
    "7d": buildDataset(d7, p7),
    "30d": buildDataset(d30, p30),
    "90d": buildDataset(d90, p90),
  };

  // --- Per-agent leaderboard, real for each range (7d / 30d / 90d) ---
  const agentUsers = await prisma.user.findMany({
    where: { isActive: true, role: { in: ["SALES_AGENT", "SALES_MANAGER"] } },
    select: { id: true, firstName: true, lastName: true, role: true },
  });
  const [agents7d, agents30d, agents90d, series] = await Promise.all([
    agentsForWindow(agentUsers, at(7), now),
    agentsForWindow(agentUsers, at(30), now),
    agentsForWindow(agentUsers, at(90), now),
    buildSeries(90),
  ]);
  const agentsByRange = { "7d": agents7d, "30d": agents30d, "90d": agents90d };

  // --- Source split (structural, last 90d of leads) ---
  const leadSources = await prisma.lead.groupBy({
    by: ["source"],
    where: { createdAt: { gte: at(90), lt: now } },
    _count: { _all: true },
  });
  const srcTotal = leadSources.reduce((s, r) => s + r._count._all, 0) || 1;
  const srcSorted = [...leadSources].sort((a, b) => b._count._all - a._count._all);
  const srcTop = srcSorted.slice(0, 4);
  const srcRest = srcSorted.slice(4).reduce((s, r) => s + r._count._all, 0);
  const sourceSplit = [
    ...srcTop.map((r) => ({ name: titleCase(r.source), p: r._count._all / srcTotal })),
    ...(srcRest > 0 ? [{ name: "Other", p: srcRest / srcTotal }] : []),
  ];

  // --- Nationalities (client base) ---
  const natRows = await prisma.client.groupBy({
    by: ["nationality"],
    _count: { _all: true },
  });
  const totalClients = natRows.reduce((s, r) => s + r._count._all, 0);
  const natSorted = [...natRows].sort((a, b) => b._count._all - a._count._all);
  const natTop = natSorted.slice(0, 4);
  const natRest = natSorted.slice(4).reduce((s, r) => s + r._count._all, 0);
  const nationalities = [
    ...natTop.map((r) => ({ name: r.nationality || "Unknown", v: r._count._all })),
    ...(natRest > 0 ? [{ name: "Other", v: natRest }] : []),
  ];

  // --- Needs-attention figures ---
  const sevenAgo = at(7);
  const [unassigned, staleNew, topAgentClients] = await Promise.all([
    prisma.enquiry.count({ where: { assignedAgentId: null } }),
    prisma.enquiry.count({ where: { status: "NEW", createdAt: { lt: sevenAgo } } }),
    prisma.client.groupBy({
      by: ["assignedAgentId"],
      where: { assignedAgentId: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { assignedAgentId: "desc" } },
      take: 1,
    }),
  ]);
  const topShare =
    totalClients > 0 && topAgentClients[0]
      ? Math.round((topAgentClients[0]._count._all / totalClients) * 100)
      : 0;
  const attention = {
    staleEnquiries: staleNew,
    unassigned,
    concentrationPct: topShare,
  };

  const activityDays = await buildActivityDays(30);

  return {
    datasets,
    agents30d,
    agentsByRange,
    series,
    sourceSplit,
    nationalities,
    totalClients,
    attention,
    activityDays,
  };
}

/* ---- AI: executive summary + free-form chat ----------------------------
 * Routed through the CRM's configured AI provider (Settings → AI), reusing the
 * `assistant_chat` task config. Never calls the LLM from the browser. */

type KpiBlock = { v: number; d: number };
type KpiSet = {
  enquiries: KpiBlock;
  leads: KpiBlock;
  clients: KpiBlock;
  conv: KpiBlock;
  bookings: KpiBlock;
  revenue: KpiBlock;
  sales: number;
};

export async function getExecutiveSummary(payload: {
  rangeLabel: string;
  kpi: KpiSet;
  topAgents: { name: string; leads: number; clients: number; conv: number; activity: number }[];
}): Promise<{ headline: string; points: { type: string; text: string }[] } | null> {
  // Everything is inside the try so an expired session / provider hiccup
  // degrades to `null` (client keeps the computed summary) instead of throwing
  // an unhandled server-action error.
  try {
    await requireExec();
    const { rangeLabel, kpi, topAgents } = payload;
    const top = topAgents
      .map(
        (a) =>
          `${a.name} (${a.leads} leads, ${a.clients} clients, ${a.conv.toFixed(1)}% enq→lead, ${a.activity} actions)`,
      )
      .join("; ");
    const system =
      "You are an analytics assistant for a real-estate CRM (Property Quest Turkey). Reply with ONLY valid JSON — no markdown, no backticks.";
    const prompt = `Write a SHORT executive summary for the CEO for the period ${rangeLabel}.
Metrics: enquiries ${kpi.enquiries.v} (${kpi.enquiries.d >= 0 ? "+" : ""}${kpi.enquiries.d}% vs previous), leads ${kpi.leads.v}, new clients ${kpi.clients.v}, enquiry→lead ${kpi.conv.v}%, bookings ${kpi.bookings.v}, revenue ${kpi.revenue.v ? "$" + kpi.revenue.v : "$0"}, sales ${kpi.sales}.
Top agents: ${top || "n/a"}.
Return exactly this shape, 3–4 points, referencing the real numbers in plain business English:
{"headline":"one punchy sentence","points":[{"type":"good|watch|risk|action","text":"one specific sentence"}]}`;
    const raw = await generateWithTask("assistant_chat", system, prompt);
    const text = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(text);
    if (parsed && parsed.headline && Array.isArray(parsed.points)) return parsed;
    return null;
  } catch {
    return null;
  }
}

export async function askExecutive(
  question: string,
  payload: {
    rangeLabel: string;
    kpi: KpiSet;
    agents: {
      name: string;
      role: string;
      enq: number;
      leads: number;
      clients: number;
      activity: number;
      rev: number;
    }[];
  },
): Promise<string> {
  // Fully guarded: any failure (expired session, unconfigured provider, network)
  // returns a friendly string rather than throwing an unhandled server error.
  try {
    await requireExec();
    const { rangeLabel, kpi, agents } = payload;
    const ctx = agents
      .slice(0, 14)
      .map(
        (a) =>
          `${a.name} (${a.role}): enq ${a.enq}, leads ${a.leads}, clients ${a.clients}, activity ${a.activity}, revenue $${a.rev}`,
      )
      .join("\n");
    const system =
      "You are an analytics assistant for the Property Quest Turkey CRM. Answer the CEO's question briefly and specifically using ONLY the data provided. If it can't be answered from this data, say so and suggest what to ask.";
    const prompt = `Question: "${question}"

CRM totals (${rangeLabel}): enquiries ${kpi.enquiries.v}, leads ${kpi.leads.v}, new clients ${kpi.clients.v}, enquiry→lead ${kpi.conv.v}%, bookings ${kpi.bookings.v}, revenue ${kpi.revenue.v ? "$" + kpi.revenue.v : "$0"}, sales ${kpi.sales}.

Per-agent (${rangeLabel}):
${ctx || "n/a"}

Answer in 1–3 short sentences, plain business English.`;
    const raw = await generateWithTask("assistant_chat", system, prompt);
    return raw.trim() || "I couldn't find an answer for that.";
  } catch (e) {
    if (e instanceof Error && /unauthorized|forbidden/i.test(e.message)) {
      return "Your session looks expired — refresh the page and sign in again, then ask me once more.";
    }
    if (e instanceof Error && /not configured|not enabled|no API key/i.test(e.message)) {
      return "AI isn't configured yet — set a provider in Settings → AI. Meanwhile I can answer agent, activity, lead and enquiry questions from the data.";
    }
    return "I can answer questions about agent activity, calls, emails, notes, leads and enquiries — try one of the example questions below.";
  }
}

/* ---- Per-user KPI report (Executive dashboard) -------------------------
 * Calls / emails / notes / spoken a user logged on leads + enquiries, by
 * day/week/month/year, plus a nextCallDate schedule (previous/today/future).
 * Counts come from the note content prefixes ([CALL]/[EMAIL]/[SPOKEN]/none),
 * the source of truth for both leads AND enquiries (enquiry contact logs only
 * write notes, not Activity rows). Attributed by note `agentId`.
 */

export type KpiPeriod = "daily" | "weekly" | "monthly" | "yearly";

type KpiCounts = { calls: number; emails: number; spoken: number; notes: number };

function _startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function _kpiPeriodWindow(period: KpiPeriod, now: Date): { start: Date; end: Date } {
  const today = _startOfDay(now);
  if (period === "daily") {
    return { start: today, end: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1) };
  }
  if (period === "weekly") {
    const mondayOffset = (today.getDay() + 6) % 7; // Mon = 0
    const start = new Date(today);
    start.setDate(today.getDate() - mondayOffset);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    return { start, end };
  }
  if (period === "monthly") {
    return {
      start: new Date(today.getFullYear(), today.getMonth(), 1),
      end: new Date(today.getFullYear(), today.getMonth() + 1, 1),
    };
  }
  return { start: new Date(today.getFullYear(), 0, 1), end: new Date(today.getFullYear() + 1, 0, 1) };
}

function _kpiTrendWindow(period: KpiPeriod, now: Date): { start: Date; end: Date; unit: "day" | "month" } {
  if (period === "daily") {
    const end = new Date(_startOfDay(now));
    end.setDate(end.getDate() + 1);
    const start = new Date(end);
    start.setDate(start.getDate() - 7); // last 7 days for context
    return { start, end, unit: "day" };
  }
  const w = _kpiPeriodWindow(period, now);
  return { ...w, unit: period === "yearly" ? "month" : "day" };
}

function _noteType(content: string): keyof KpiCounts {
  if (content.startsWith("[CALL] ")) return "calls";
  if (content.startsWith("[EMAIL] ")) return "emails";
  if (content.startsWith("[SPOKEN] ")) return "spoken";
  return "notes";
}

function _dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function _monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** The same-length period immediately before `pw` (yesterday / last week /
 *  last calendar month / last calendar year) for vs-previous deltas. */
function _kpiPrevWindow(
  period: KpiPeriod,
  pw: { start: Date; end: Date },
): { start: Date; end: Date } {
  const end = pw.start;
  if (period === "daily") {
    const start = new Date(end);
    start.setDate(start.getDate() - 1);
    return { start, end };
  }
  if (period === "weekly") {
    const start = new Date(end);
    start.setDate(start.getDate() - 7);
    return { start, end };
  }
  if (period === "monthly") {
    return { start: new Date(end.getFullYear(), end.getMonth() - 1, 1), end };
  }
  return { start: new Date(end.getFullYear() - 1, 0, 1), end };
}

/** Count a user's lead + enquiry notes in [gte, lt), optionally only those
 *  whose content begins with `prefix` (e.g. "[CALL] "). */
async function _countUserNotes(
  userId: string,
  gte: Date,
  lt: Date,
  prefix?: string,
): Promise<number> {
  const where = {
    agentId: userId,
    createdAt: { gte, lt },
    ...(prefix ? { content: { startsWith: prefix } } : {}),
  };
  const [l, e] = await Promise.all([
    prisma.leadNote.count({ where }),
    prisma.enquiryNote.count({ where }),
  ]);
  return l + e;
}

export async function getUserKpiReport(userId: string, period: KpiPeriod) {
  await requireExec();
  if (!userId) throw new Error("Pick a user");

  const now = new Date();
  const pw = _kpiPeriodWindow(period, now);
  const tw = _kpiTrendWindow(period, now);
  const fetchStart = tw.start < pw.start ? tw.start : pw.start;
  const fetchEnd = tw.end > pw.end ? tw.end : pw.end;

  const [leadNotes, enquiryNotes] = await Promise.all([
    prisma.leadNote.findMany({
      where: { agentId: userId, createdAt: { gte: fetchStart, lt: fetchEnd } },
      select: { content: true, createdAt: true },
    }),
    prisma.enquiryNote.findMany({
      where: { agentId: userId, createdAt: { gte: fetchStart, lt: fetchEnd } },
      select: { content: true, createdAt: true },
    }),
  ]);

  const blank = (): KpiCounts => ({ calls: 0, emails: 0, spoken: 0, notes: 0 });
  const totals = blank();
  const byEntity = { leads: blank(), enquiries: blank() };

  const bucketKey = tw.unit === "month" ? _monthKey : _dayKey;
  const buckets = new Map<string, KpiCounts>();
  if (tw.unit === "day") {
    for (const d = new Date(tw.start); d < tw.end; d.setDate(d.getDate() + 1)) {
      buckets.set(_dayKey(d), blank());
    }
  } else {
    for (const m = new Date(tw.start); m < tw.end; m.setMonth(m.getMonth() + 1)) {
      buckets.set(_monthKey(m), blank());
    }
  }

  const rows: Array<{ content: string; createdAt: Date; entity: "leads" | "enquiries" }> = [
    ...leadNotes.map((n) => ({ ...n, entity: "leads" as const })),
    ...enquiryNotes.map((n) => ({ ...n, entity: "enquiries" as const })),
  ];

  for (const r of rows) {
    const t = _noteType(r.content);
    const created = new Date(r.createdAt);
    if (created >= pw.start && created < pw.end) {
      totals[t] += 1;
      byEntity[r.entity][t] += 1;
    }
    if (created >= tw.start && created < tw.end) {
      const b = buckets.get(bucketKey(created));
      if (b) b[t] += 1;
    }
  }

  const trend = Array.from(buckets.entries()).map(([bucket, c]) => ({ bucket, ...c }));

  // Previous-period totals (for the vs-previous deltas on each metric).
  const prev = _kpiPrevWindow(period, pw);
  const today = _startOfDay(now);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const [lp, lt, lf, ep, et, ef, pTotal, pCalls, pEmails, pSpoken] =
    await Promise.all([
      prisma.lead.count({ where: { ownerId: userId, nextCallDate: { lt: today } } }),
      prisma.lead.count({ where: { ownerId: userId, nextCallDate: { gte: today, lt: tomorrow } } }),
      prisma.lead.count({ where: { ownerId: userId, nextCallDate: { gte: tomorrow } } }),
      prisma.enquiry.count({ where: { assignedAgentId: userId, nextCallDate: { lt: today } } }),
      prisma.enquiry.count({ where: { assignedAgentId: userId, nextCallDate: { gte: today, lt: tomorrow } } }),
      prisma.enquiry.count({ where: { assignedAgentId: userId, nextCallDate: { gte: tomorrow } } }),
      _countUserNotes(userId, prev.start, prev.end),
      _countUserNotes(userId, prev.start, prev.end, "[CALL] "),
      _countUserNotes(userId, prev.start, prev.end, "[EMAIL] "),
      _countUserNotes(userId, prev.start, prev.end, "[SPOKEN] "),
    ]);

  const previous = {
    calls: pCalls,
    emails: pEmails,
    spoken: pSpoken,
    notes: pTotal - pCalls - pEmails - pSpoken,
    total: pTotal,
  };

  return {
    period,
    totals: {
      ...totals,
      total: totals.calls + totals.emails + totals.spoken + totals.notes,
    },
    previous,
    byEntity,
    trend,
    trendUnit: tw.unit,
    callSchedule: { previous: lp + ep, today: lt + et, future: lf + ef },
  };
}
