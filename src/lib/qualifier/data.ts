import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

/** Users the qualifier can suggest or alert: active sales agents and
 *  managers, plus anyone Imran has given an agent profile. */
export function qualifierUserWhere(): Prisma.UserWhereInput {
  return {
    isActive: true,
    OR: [{ role: { in: ["SALES_AGENT", "SALES_MANAGER"] } }, { agentProfile: { isNot: null } }],
  };
}

/** Lead stages that still need work. */
export const OPEN_LEAD_WHERE: Prisma.LeadWhereInput = { stage: { notIn: ["WON", "LOST"] } };

/** Tier for a score using the thresholds in a rules version, e.g.
 *  { hot: 80, warm: 50, cold: 20 }. Null when the rules don't define them. */
export function tierForScore(rules: unknown, score: number): string | null {
  const t = (rules as { tiers?: Record<string, unknown> } | null)?.tiers;
  if (!t || typeof t.hot !== "number" || typeof t.warm !== "number" || typeof t.cold !== "number") {
    return null;
  }
  if (score >= t.hot) return "hot";
  if (score >= t.warm) return "warm";
  if (score >= t.cold) return "cold";
  return "junk";
}

// ---------------------------------------------------------------------------
// Possible duplicates — the spec flags (doesn't score) an enquiry whose phone
// or email already belongs to another enquiry, a lead's client, or a client.
// Phones are compared on their last 10 digits so "+90 532…" and "0532…" match.
// ---------------------------------------------------------------------------

export type PossibleDuplicate = {
  type: "enquiry" | "lead" | "client";
  id: string;
  refId: string | null;
  ownerId: string | null;
  matchedOn: ("email" | "phone")[];
};

export function normEmail(e: string | null | undefined): string | null {
  const v = (e ?? "").trim().toLowerCase();
  return v.includes("@") && v.length > 3 ? v : null;
}

export function phoneKey(p: string | null | undefined): string | null {
  const digits = (p ?? "").replace(/\D/g, "");
  return digits.length >= 7 ? digits.slice(-10) : null;
}

type DupRow = {
  type: "enquiry" | "lead" | "client";
  id: string;
  refId: string | null;
  ownerId: string | null;
  email: string | null;
  phone10: string | null;
};

export async function findPossibleDuplicates(
  enquiries: { id: string; email: string | null; phone: string | null }[],
): Promise<Map<string, PossibleDuplicate[]>> {
  const out = new Map<string, PossibleDuplicate[]>();
  const emails = [...new Set(enquiries.map((e) => normEmail(e.email)).filter((v): v is string => !!v))];
  const phones = [...new Set(enquiries.map((e) => phoneKey(e.phone)).filter((v): v is string => !!v))];
  if (emails.length === 0 && phones.length === 0) return out;

  const rows = await prisma.$queryRaw<DupRow[]>`
    SELECT 'enquiry' AS type, e.id, e."refId", e."assignedAgentId" AS "ownerId",
           lower(e.email) AS email, right(regexp_replace(e.phone, '\D', '', 'g'), 10) AS phone10
    FROM enquiries e
    WHERE lower(e.email) = ANY(${emails}) OR right(regexp_replace(e.phone, '\D', '', 'g'), 10) = ANY(${phones})
    UNION ALL
    SELECT 'lead', l.id, l."refId", l."ownerId",
           lower(c.email), right(regexp_replace(c.phone, '\D', '', 'g'), 10)
    FROM leads l JOIN clients c ON c.id = l."clientId"
    WHERE lower(c.email) = ANY(${emails}) OR right(regexp_replace(c.phone, '\D', '', 'g'), 10) = ANY(${phones})
    UNION ALL
    SELECT 'client', c.id, NULL, c."assignedAgentId",
           lower(c.email), right(regexp_replace(c.phone, '\D', '', 'g'), 10)
    FROM clients c
    WHERE (lower(c.email) = ANY(${emails}) OR right(regexp_replace(c.phone, '\D', '', 'g'), 10) = ANY(${phones}))
      AND NOT EXISTS (SELECT 1 FROM leads l WHERE l."clientId" = c.id)
  `;

  for (const enq of enquiries) {
    const em = normEmail(enq.email);
    const ph = phoneKey(enq.phone);
    const matches: PossibleDuplicate[] = [];
    for (const r of rows) {
      if (r.type === "enquiry" && r.id === enq.id) continue;
      const on: ("email" | "phone")[] = [];
      if (em && r.email === em) on.push("email");
      if (ph && r.phone10 === ph) on.push("phone");
      if (on.length) matches.push({ type: r.type, id: r.id, refId: r.refId, ownerId: r.ownerId, matchedOn: on });
    }
    if (matches.length) out.set(enq.id, matches.slice(0, 5));
  }
  return out;
}

// ---------------------------------------------------------------------------
// Per-agent activity counts for one day (spec Phase 2 endpoint 8). Counts
// only — note text is classified in SQL and never leaves the database.
// Contact logs are notes prefixed "[CALL] ", "[EMAIL] " or "[SPOKEN] " on
// enquiries and leads (addEnquiryContactLog / addLeadContactLog).
// ---------------------------------------------------------------------------

export type AgentActivity = {
  userId: string;
  name: string;
  role: string;
  callsLogged: number;
  emailsLogged: number;
  spokenLogged: number;
  notesLogged: number;
  enquiriesTouched: number;
  leadsTouched: number;
  tasksCompleted: number;
  enquiriesAssigned: number;
  leadsCreated: number;
  dealsWon: number;
  dealsLost: number;
  openLeadCountNow: number;
};

type NoteRow = { agentId: string; kind: "call" | "email" | "spoken" | "note"; n: number };
type TouchRow = { agentId: string; n: number };

export async function activitySummary(start: Date, end: Date): Promise<AgentActivity[]> {
  const users = await prisma.user.findMany({
    where: qualifierUserWhere(),
    select: { id: true, firstName: true, lastName: true, role: true },
    orderBy: { firstName: "asc" },
  });
  const ids = users.map((u) => u.id);
  if (ids.length === 0) return [];

  // created_at columns are "timestamp without time zone" holding UTC; compare
  // with explicit UTC values so the result never depends on the DB session's
  // TimeZone setting.
  const utc = (d: Date) => Prisma.sql`${d.toISOString().slice(0, 23).replace("T", " ")}::timestamp`;
  const from = utc(start);
  const to = utc(end);

  const kindSql = Prisma.sql`CASE WHEN content LIKE '[CALL]%' THEN 'call'
                                  WHEN content LIKE '[EMAIL]%' THEN 'email'
                                  WHEN content LIKE '[SPOKEN]%' THEN 'spoken'
                                  ELSE 'note' END`;

  const [enqNotes, leadNotes, enqTouched, leadTouched, tasks, assigns, leads, deals, openLeads] =
    await Promise.all([
      prisma.$queryRaw<NoteRow[]>`
        SELECT "agentId", ${kindSql} AS kind, count(*)::int AS n FROM enquiry_notes
        WHERE "createdAt" >= ${from} AND "createdAt" < ${to} GROUP BY 1, 2`,
      prisma.$queryRaw<NoteRow[]>`
        SELECT "agentId", ${kindSql} AS kind, count(*)::int AS n FROM lead_notes
        WHERE "createdAt" >= ${from} AND "createdAt" < ${to} GROUP BY 1, 2`,
      prisma.$queryRaw<TouchRow[]>`
        SELECT "agentId", count(DISTINCT "enquiryId")::int AS n FROM enquiry_notes
        WHERE "createdAt" >= ${from} AND "createdAt" < ${to} GROUP BY 1`,
      prisma.$queryRaw<TouchRow[]>`
        SELECT "agentId", count(DISTINCT "leadId")::int AS n FROM lead_notes
        WHERE "createdAt" >= ${from} AND "createdAt" < ${to} GROUP BY 1`,
      prisma.task.groupBy({
        by: ["assigneeId"],
        where: { status: "DONE", completedAt: { gte: start, lt: end }, assigneeId: { in: ids } },
        _count: { _all: true },
      }),
      prisma.auditLog.findMany({
        where: { action: "ASSIGN", entityType: "Enquiry", createdAt: { gte: start, lt: end } },
        select: { changes: true },
      }),
      prisma.lead.groupBy({
        by: ["ownerId"],
        where: { createdAt: { gte: start, lt: end }, ownerId: { in: ids } },
        _count: { _all: true },
      }),
      prisma.deal.groupBy({
        by: ["ownerId", "result"],
        where: { result: { in: ["WON", "LOST"] }, actualCloseDate: { gte: start, lt: end }, ownerId: { in: ids } },
        _count: { _all: true },
      }),
      prisma.lead.groupBy({
        by: ["ownerId"],
        where: { ...OPEN_LEAD_WHERE, ownerId: { in: ids } },
        _count: { _all: true },
      }),
    ]);

  const blank = (): Omit<AgentActivity, "userId" | "name" | "role"> => ({
    callsLogged: 0, emailsLogged: 0, spokenLogged: 0, notesLogged: 0,
    enquiriesTouched: 0, leadsTouched: 0, tasksCompleted: 0, enquiriesAssigned: 0,
    leadsCreated: 0, dealsWon: 0, dealsLost: 0, openLeadCountNow: 0,
  });
  const by = new Map(users.map((u) => [u.id, blank()]));
  const noteField = { call: "callsLogged", email: "emailsLogged", spoken: "spokenLogged", note: "notesLogged" } as const;

  for (const r of [...enqNotes, ...leadNotes]) {
    const a = by.get(r.agentId);
    if (a) a[noteField[r.kind]] += r.n;
  }
  for (const r of enqTouched) { const a = by.get(r.agentId); if (a) a.enquiriesTouched = r.n; }
  for (const r of leadTouched) { const a = by.get(r.agentId); if (a) a.leadsTouched = r.n; }
  for (const r of tasks) { const a = by.get(r.assigneeId); if (a) a.tasksCompleted = r._count._all; }
  for (const r of assigns) {
    const agentId = (r.changes as { assignedAgentId?: unknown } | null)?.assignedAgentId;
    const a = typeof agentId === "string" ? by.get(agentId) : undefined;
    if (a) a.enquiriesAssigned += 1;
  }
  for (const r of leads) { const a = by.get(r.ownerId); if (a) a.leadsCreated = r._count._all; }
  for (const r of deals) {
    const a = by.get(r.ownerId);
    if (a) a[r.result === "WON" ? "dealsWon" : "dealsLost"] = r._count._all;
  }
  for (const r of openLeads) { const a = by.get(r.ownerId); if (a) a.openLeadCountNow = r._count._all; }

  return users.map((u) => ({
    userId: u.id,
    name: `${u.firstName} ${u.lastName}`.trim(),
    role: u.role,
    ...by.get(u.id)!,
  }));
}
