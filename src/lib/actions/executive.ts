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

  // --- Per-agent leaderboard (30-day base; client scales other ranges) ---
  const win30 = { gte: at(30), lt: now };
  const [
    agentUsers,
    enqByAgent,
    leadByOwner,
    clientByAgent,
    actByUser,
    saleByAgent,
  ] = await Promise.all([
    prisma.user.findMany({
      where: { role: { in: ["SALES_AGENT", "SALES_MANAGER"] } },
      select: { id: true, firstName: true, lastName: true, role: true },
    }),
    prisma.enquiry.groupBy({
      by: ["assignedAgentId"],
      where: { createdAt: win30, assignedAgentId: { not: null } },
      _count: { _all: true },
    }),
    prisma.lead.groupBy({
      by: ["ownerId"],
      where: { createdAt: win30 },
      _count: { _all: true },
    }),
    prisma.client.groupBy({
      by: ["assignedAgentId"],
      where: { createdAt: win30, assignedAgentId: { not: null } },
      _count: { _all: true },
    }),
    prisma.activity.groupBy({
      by: ["userId"],
      where: { createdAt: win30 },
      _count: { _all: true },
    }),
    prisma.sale.groupBy({
      by: ["agentId"],
      where: { status: WON, createdAt: win30 },
      _sum: { salePrice: true },
    }),
  ]);

  const map = <T extends { _count?: { _all: number } }>(
    rows: T[],
    key: keyof T,
  ) => {
    const m = new Map<string, number>();
    for (const r of rows) {
      const id = r[key] as unknown as string | null;
      if (id) m.set(id, r._count?._all ?? 0);
    }
    return m;
  };
  const enqM = map(enqByAgent, "assignedAgentId");
  const leadM = map(leadByOwner, "ownerId");
  const clientM = map(clientByAgent, "assignedAgentId");
  const actM = map(actByUser, "userId");
  const revM = new Map<string, number>();
  for (const r of saleByAgent) revM.set(r.agentId, Number(r._sum.salePrice ?? 0));

  const agents30d = agentUsers
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

  return { datasets, agents30d, sourceSplit, nationalities, totalClients, attention };
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
  try {
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
  try {
    const raw = await generateWithTask("assistant_chat", system, prompt);
    return raw.trim() || "I couldn't find an answer for that.";
  } catch (e) {
    if (e instanceof Error && /not configured|not enabled|no API key/i.test(e.message)) {
      return "AI isn't configured yet — set a provider in Settings → AI. Meanwhile I can answer agent, activity, lead and enquiry questions from the data.";
    }
    return "I can answer questions about agent activity, calls, emails, notes, leads and enquiries — try one of the example questions below.";
  }
}
