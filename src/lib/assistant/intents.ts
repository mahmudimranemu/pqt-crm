import prisma from "@/lib/prisma";
import type {
  ActivityType,
  ClientStatus,
  DealStage,
  EnquiryStatus,
  LeadStage,
  TaskStatus,
} from "@prisma/client";

export type { AssistantResult } from "./types";
import type { AssistantResult } from "./types";
export { summarizeResultForHistory } from "./types";

const PAGE_SIZE = 5;

export const INTENT_NAMES = [
  "leads.byOwner",
  "leads.byStage",
  "leads.recent",
  "clients.byOwner",
  "clients.byStatus",
  "clients.recent",
  "enquiries.byStatus",
  "enquiries.byAgent",
  "enquiries.unassigned",
  "enquiries.recent",
  "deals.byOwner",
  "deals.byStage",
  "deals.recent",
  "tasks.byOwner",
  "tasks.overdue",
  "notes.byUser",
  "activities.byUser",
  "user.overview",
  "count.leads",
  "count.clients",
  "count.enquiries",
  "count.deals",
  "freeform",
] as const;
export type IntentName = (typeof INTENT_NAMES)[number];

export interface IntentInvocation {
  intent: IntentName;
  params?: Record<string, unknown>;
  reply?: string;
}

function asArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === "string");
  if (typeof v === "string") return [v];
  return [];
}

function fmtPersonName(u: { firstName: string; lastName: string }) {
  return `${u.firstName} ${u.lastName}`;
}

function sinceFromDays(daysAgo: unknown): Date | undefined {
  const n = typeof daysAgo === "number" ? daysAgo : parseInt(String(daysAgo ?? ""), 10);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function relativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const m = Math.floor(diffMs / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return date.toLocaleDateString();
}

export async function executeIntent(
  invocation: IntentInvocation,
): Promise<AssistantResult> {
  const params = invocation.params ?? {};

  switch (invocation.intent) {
    // ===== LEADS =====
    case "leads.byOwner": {
      const ownerIds = asArray(params.ownerIds);
      if (ownerIds.length === 0) {
        return { kind: "text", text: "Which user did you mean? Please @-mention them." };
      }
      const where = { ownerId: { in: ownerIds } };
      const [rows, total, owners] = await Promise.all([
        prisma.lead.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: PAGE_SIZE,
          select: {
            id: true,
            title: true,
            leadNumber: true,
            stage: true,
            owner: { select: { firstName: true, lastName: true } },
          },
        }),
        prisma.lead.count({ where }),
        prisma.user.findMany({
          where: { id: { in: ownerIds } },
          select: { id: true, firstName: true, lastName: true },
        }),
      ]);
      return {
        kind: "list",
        title: `Leads assigned to ${owners.map(fmtPersonName).join(", ") || "selected users"} (${total})`,
        items: rows.map((l) => ({
          title: `${l.leadNumber} — ${l.title}`,
          subtitle: `${l.stage} · owner: ${fmtPersonName(l.owner)}`,
          href: `/leads/${l.id}`,
        })),
        total,
        viewAllHref:
          ownerIds.length === 1 ? `/leads?consultant=${ownerIds[0]}` : undefined,
      };
    }

    case "leads.byStage": {
      const stage = String(params.stage ?? "") as LeadStage;
      if (!stage) return { kind: "text", text: "Which stage?" };
      const where = { stage };
      const [rows, total] = await Promise.all([
        prisma.lead.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: PAGE_SIZE,
          select: {
            id: true,
            title: true,
            leadNumber: true,
            owner: { select: { firstName: true, lastName: true } },
          },
        }),
        prisma.lead.count({ where }),
      ]);
      return {
        kind: "list",
        title: `Leads in stage ${stage} (${total})`,
        items: rows.map((l) => ({
          title: `${l.leadNumber} — ${l.title}`,
          subtitle: `owner: ${fmtPersonName(l.owner)}`,
          href: `/leads/${l.id}`,
        })),
        total,
        viewAllHref: `/leads?stage=${stage}`,
      };
    }

    case "leads.recent": {
      const since = sinceFromDays(params.daysAgo);
      const ownerIds = asArray(params.ownerIds);
      const where: Record<string, unknown> = {};
      if (since) where.createdAt = { gte: since };
      if (ownerIds.length) where.ownerId = { in: ownerIds };
      const [rows, total] = await Promise.all([
        prisma.lead.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: PAGE_SIZE,
          select: {
            id: true,
            title: true,
            leadNumber: true,
            stage: true,
            createdAt: true,
            owner: { select: { firstName: true, lastName: true } },
          },
        }),
        prisma.lead.count({ where }),
      ]);
      const titlePieces = ["Leads"];
      if (since) titlePieces.push(`in last ${params.daysAgo} day(s)`);
      else titlePieces.push("(recent)");
      return {
        kind: "list",
        title: `${titlePieces.join(" ")} (${total})`,
        items: rows.map((l) => ({
          title: `${l.leadNumber} — ${l.title}`,
          subtitle: `${l.stage} · ${relativeTime(l.createdAt)} · owner: ${fmtPersonName(l.owner)}`,
          href: `/leads/${l.id}`,
        })),
        total,
        viewAllHref:
          ownerIds.length === 1 ? `/leads?consultant=${ownerIds[0]}` : "/leads",
      };
    }

    // ===== CLIENTS =====
    case "clients.byOwner": {
      const agentIds = asArray(params.agentIds);
      if (agentIds.length === 0) {
        return { kind: "text", text: "Which user? Please @-mention them." };
      }
      const where = { assignedAgentId: { in: agentIds } };
      const [rows, total, agents] = await Promise.all([
        prisma.client.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: PAGE_SIZE,
          select: { id: true, firstName: true, lastName: true, status: true, email: true },
        }),
        prisma.client.count({ where }),
        prisma.user.findMany({
          where: { id: { in: agentIds } },
          select: { firstName: true, lastName: true },
        }),
      ]);
      return {
        kind: "list",
        title: `Clients assigned to ${agents.map(fmtPersonName).join(", ")} (${total})`,
        items: rows.map((c) => ({
          title: `${c.firstName} ${c.lastName}`,
          subtitle: `${c.status} · ${c.email}`,
          href: `/clients/${c.id}`,
        })),
        total,
        viewAllHref: agentIds.length === 1 ? `/clients?agent=${agentIds[0]}` : "/clients",
      };
    }

    case "clients.byStatus": {
      const status = String(params.status ?? "") as ClientStatus;
      if (!status) return { kind: "text", text: "Which client status?" };
      const where = { status };
      const [rows, total] = await Promise.all([
        prisma.client.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: PAGE_SIZE,
          select: { id: true, firstName: true, lastName: true, email: true },
        }),
        prisma.client.count({ where }),
      ]);
      return {
        kind: "list",
        title: `Clients with status ${status} (${total})`,
        items: rows.map((c) => ({
          title: `${c.firstName} ${c.lastName}`,
          subtitle: c.email,
          href: `/clients/${c.id}`,
        })),
        total,
        viewAllHref: `/clients?status=${status}`,
      };
    }

    case "clients.recent": {
      const since = sinceFromDays(params.daysAgo);
      const where = since ? { createdAt: { gte: since } } : {};
      const [rows, total] = await Promise.all([
        prisma.client.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: PAGE_SIZE,
          select: { id: true, firstName: true, lastName: true, status: true, email: true, createdAt: true },
        }),
        prisma.client.count({ where }),
      ]);
      return {
        kind: "list",
        title: since
          ? `Clients in last ${params.daysAgo} day(s) (${total})`
          : `Recent clients (${total} total)`,
        items: rows.map((c) => ({
          title: `${c.firstName} ${c.lastName}`,
          subtitle: `${c.status} · ${relativeTime(c.createdAt)} · ${c.email}`,
          href: `/clients/${c.id}`,
        })),
        total,
        viewAllHref: "/clients",
      };
    }

    // ===== ENQUIRIES =====
    case "enquiries.byStatus": {
      const status = String(params.status ?? "") as EnquiryStatus;
      if (!status) return { kind: "text", text: "Which enquiry status?" };
      return await listEnquiries(
        { status },
        `Enquiries with status ${status}`,
        `/clients/enquiries?status=${status}`,
      );
    }

    case "enquiries.byAgent": {
      const agentIds = asArray(params.agentIds);
      if (agentIds.length === 0) {
        return { kind: "text", text: "Which user? Please @-mention them." };
      }
      const agents = await prisma.user.findMany({
        where: { id: { in: agentIds } },
        select: { firstName: true, lastName: true },
      });
      return await listEnquiries(
        { assignedAgentId: { in: agentIds } },
        `Enquiries assigned to ${agents.map(fmtPersonName).join(", ")}`,
        agentIds.length === 1
          ? `/clients/enquiries?consultant=${agentIds[0]}`
          : "/clients/enquiries",
      );
    }

    case "enquiries.unassigned":
      return await listEnquiries(
        { assignedAgentId: null },
        "Unassigned enquiries",
        "/clients/enquiries?consultant=unassigned",
      );

    case "enquiries.recent": {
      const since = sinceFromDays(params.daysAgo);
      const where = since ? { createdAt: { gte: since } } : {};
      return await listEnquiries(
        where,
        since ? `Enquiries in last ${params.daysAgo} day(s)` : "Recent enquiries",
        "/clients/enquiries",
      );
    }

    // ===== DEALS =====
    case "deals.byOwner": {
      const ownerIds = asArray(params.ownerIds);
      if (ownerIds.length === 0) {
        return { kind: "text", text: "Which user? Please @-mention them." };
      }
      const where = { ownerId: { in: ownerIds } };
      const [rows, total, owners] = await Promise.all([
        prisma.deal.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: PAGE_SIZE,
          select: { id: true, dealNumber: true, title: true, stage: true, dealValue: true, currency: true },
        }),
        prisma.deal.count({ where }),
        prisma.user.findMany({
          where: { id: { in: ownerIds } },
          select: { firstName: true, lastName: true },
        }),
      ]);
      return {
        kind: "list",
        title: `Deals owned by ${owners.map(fmtPersonName).join(", ")} (${total})`,
        items: rows.map((d) => ({
          title: `${d.dealNumber} — ${d.title}`,
          subtitle: `${d.stage} · ${d.dealValue.toString()} ${d.currency}`,
          href: `/deals/${d.id}`,
        })),
        total,
        viewAllHref: "/deals",
      };
    }

    case "deals.byStage": {
      const stage = String(params.stage ?? "") as DealStage;
      if (!stage) return { kind: "text", text: "Which deal stage?" };
      const where = { stage };
      const [rows, total] = await Promise.all([
        prisma.deal.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: PAGE_SIZE,
          select: { id: true, dealNumber: true, title: true, dealValue: true, currency: true },
        }),
        prisma.deal.count({ where }),
      ]);
      return {
        kind: "list",
        title: `Deals in stage ${stage} (${total})`,
        items: rows.map((d) => ({
          title: `${d.dealNumber} — ${d.title}`,
          subtitle: `${d.dealValue.toString()} ${d.currency}`,
          href: `/deals/${d.id}`,
        })),
        total,
        viewAllHref: "/deals",
      };
    }

    case "deals.recent": {
      const since = sinceFromDays(params.daysAgo);
      const where = since ? { createdAt: { gte: since } } : {};
      const [rows, total] = await Promise.all([
        prisma.deal.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: PAGE_SIZE,
          select: { id: true, dealNumber: true, title: true, stage: true, dealValue: true, currency: true, createdAt: true },
        }),
        prisma.deal.count({ where }),
      ]);
      return {
        kind: "list",
        title: since
          ? `Deals in last ${params.daysAgo} day(s) (${total})`
          : `Recent deals (${total} total)`,
        items: rows.map((d) => ({
          title: `${d.dealNumber} — ${d.title}`,
          subtitle: `${d.stage} · ${d.dealValue.toString()} ${d.currency} · ${relativeTime(d.createdAt)}`,
          href: `/deals/${d.id}`,
        })),
        total,
        viewAllHref: "/deals",
      };
    }

    // ===== TASKS =====
    case "tasks.byOwner": {
      const assigneeIds = asArray(params.assigneeIds);
      const includeStatuses = (asArray(params.statuses).filter(Boolean) as TaskStatus[]) ||
        (["TODO", "IN_PROGRESS"] as TaskStatus[]);
      const statusList = includeStatuses.length
        ? includeStatuses
        : (["TODO", "IN_PROGRESS"] as TaskStatus[]);
      const where: Record<string, unknown> = { status: { in: statusList } };
      if (assigneeIds.length) where.assigneeId = { in: assigneeIds };
      const [rows, total, assignees] = await Promise.all([
        prisma.task.findMany({
          where,
          orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
          take: PAGE_SIZE,
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            dueDate: true,
            leadId: true,
            assignee: { select: { firstName: true, lastName: true } },
          },
        }),
        prisma.task.count({ where }),
        assigneeIds.length
          ? prisma.user.findMany({
              where: { id: { in: assigneeIds } },
              select: { firstName: true, lastName: true },
            })
          : Promise.resolve([]),
      ]);
      const assigneeLabel = assignees.length
        ? ` for ${assignees.map(fmtPersonName).join(", ")}`
        : "";
      return {
        kind: "list",
        title: `Open tasks${assigneeLabel} (${total})`,
        items: rows.map((t) => ({
          title: t.title,
          subtitle: `${t.status} · ${t.priority}${t.dueDate ? ` · due ${t.dueDate.toLocaleDateString()}` : ""} · ${fmtPersonName(t.assignee)}`,
          href: t.leadId ? `/leads/${t.leadId}` : "/tasks",
        })),
        total,
        viewAllHref: "/tasks",
      };
    }

    case "tasks.overdue": {
      const assigneeIds = asArray(params.assigneeIds);
      const where: Record<string, unknown> = {
        status: { in: ["TODO", "IN_PROGRESS"] as TaskStatus[] },
        dueDate: { lt: new Date() },
      };
      if (assigneeIds.length) where.assigneeId = { in: assigneeIds };
      const [rows, total] = await Promise.all([
        prisma.task.findMany({
          where,
          orderBy: { dueDate: "asc" },
          take: PAGE_SIZE,
          select: {
            id: true,
            title: true,
            priority: true,
            dueDate: true,
            leadId: true,
            assignee: { select: { firstName: true, lastName: true } },
          },
        }),
        prisma.task.count({ where }),
      ]);
      return {
        kind: "list",
        title: `Overdue tasks (${total})`,
        items: rows.map((t) => ({
          title: t.title,
          subtitle: `${t.priority} · due ${t.dueDate?.toLocaleDateString() ?? "—"} · ${fmtPersonName(t.assignee)}`,
          href: t.leadId ? `/leads/${t.leadId}` : "/tasks",
        })),
        total,
        viewAllHref: "/tasks",
      };
    }

    // ===== NOTES & ACTIVITIES =====
    case "notes.byUser": {
      const userIds = asArray(params.userIds);
      if (userIds.length === 0) {
        return { kind: "text", text: "Which user? Please @-mention them." };
      }
      const since = sinceFromDays(params.daysAgo);
      const whereLead: Record<string, unknown> = { agentId: { in: userIds } };
      if (since) whereLead.createdAt = { gte: since };
      const whereEnq: Record<string, unknown> = { agentId: { in: userIds } };
      if (since) whereEnq.createdAt = { gte: since };
      const [leadNotes, enqNotes, lTotal, eTotal, users] = await Promise.all([
        prisma.leadNote.findMany({
          where: whereLead,
          orderBy: { createdAt: "desc" },
          take: PAGE_SIZE,
          include: {
            lead: { select: { id: true, title: true, leadNumber: true } },
            agent: { select: { firstName: true, lastName: true } },
          },
        }),
        prisma.enquiryNote.findMany({
          where: whereEnq,
          orderBy: { createdAt: "desc" },
          take: PAGE_SIZE,
          include: {
            enquiry: { select: { id: true, firstName: true, lastName: true, refId: true } },
            agent: { select: { firstName: true, lastName: true } },
          },
        }),
        prisma.leadNote.count({ where: whereLead }),
        prisma.enquiryNote.count({ where: whereEnq }),
        prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { firstName: true, lastName: true },
        }),
      ]);
      const merged = [
        ...leadNotes.map((n) => ({
          when: n.createdAt,
          title: trim(n.content, 80),
          subtitle: `Lead ${n.lead.leadNumber} · ${relativeTime(n.createdAt)} · ${fmtPersonName(n.agent)}`,
          href: `/leads/${n.lead.id}`,
        })),
        ...enqNotes.map((n) => ({
          when: n.createdAt,
          title: trim(n.content, 80),
          subtitle: `Enquiry ${n.enquiry.refId ?? n.enquiry.id.slice(0, 8)} · ${relativeTime(n.createdAt)} · ${fmtPersonName(n.agent)}`,
          href: `/clients/enquiries/${n.enquiry.id}`,
        })),
      ]
        .sort((a, b) => b.when.getTime() - a.when.getTime())
        .slice(0, PAGE_SIZE);

      return {
        kind: "list",
        title: `Recent notes by ${users.map(fmtPersonName).join(", ")} (${lTotal + eTotal})`,
        items: merged.map(({ when: _w, ...rest }) => rest),
        total: lTotal + eTotal,
      };
    }

    case "activities.byUser": {
      const userIds = asArray(params.userIds);
      if (userIds.length === 0) {
        return { kind: "text", text: "Which user? Please @-mention them." };
      }
      const since = sinceFromDays(params.daysAgo);
      const types = asArray(params.types).filter(Boolean) as ActivityType[];
      const where: Record<string, unknown> = { userId: { in: userIds } };
      if (since) where.createdAt = { gte: since };
      if (types.length) where.type = { in: types };
      const [rows, total, users] = await Promise.all([
        prisma.activity.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: PAGE_SIZE,
          select: {
            id: true,
            type: true,
            title: true,
            description: true,
            createdAt: true,
            leadId: true,
            enquiryId: true,
            dealId: true,
            user: { select: { firstName: true, lastName: true } },
          },
        }),
        prisma.activity.count({ where }),
        prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { firstName: true, lastName: true },
        }),
      ]);
      const typeLabel = types.length ? ` (${types.join(", ")})` : "";
      return {
        kind: "list",
        title: `Recent activity${typeLabel} by ${users.map(fmtPersonName).join(", ")} (${total})`,
        items: rows.map((a) => ({
          title: `[${a.type}] ${a.title}`,
          subtitle: `${relativeTime(a.createdAt)}${a.description ? ` · ${trim(a.description, 80)}` : ""}`,
          href: a.leadId
            ? `/leads/${a.leadId}`
            : a.dealId
              ? `/deals/${a.dealId}`
              : a.enquiryId
                ? `/clients/enquiries/${a.enquiryId}`
                : "/notifications",
        })),
        total,
      };
    }

    // ===== USER OVERVIEW (compound) =====
    case "user.overview": {
      const userIds = asArray(params.userIds);
      const userId = userIds[0];
      if (!userId) {
        return { kind: "text", text: "Which user? Please @-mention them." };
      }
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          office: true,
          lastSeen: true,
        },
      });
      if (!user) return { kind: "text", text: "User not found." };

      const since = sinceFromDays(params.daysAgo); // optional window for activity
      const baseWindow = since ? { createdAt: { gte: since } } : {};

      const [
        leadCount,
        leadsByStage,
        clientCount,
        dealCount,
        wonDealCount,
        openTasks,
        overdueTasks,
        recentActivities,
        recentNotes,
      ] = await Promise.all([
        prisma.lead.count({ where: { ownerId: userId, ...baseWindow } }),
        prisma.lead.groupBy({
          by: ["stage"],
          where: { ownerId: userId, ...baseWindow },
          _count: true,
        }),
        prisma.client.count({ where: { assignedAgentId: userId, ...baseWindow } }),
        prisma.deal.count({ where: { ownerId: userId, ...baseWindow } }),
        prisma.deal.count({
          where: { ownerId: userId, result: "WON", ...baseWindow },
        }),
        prisma.task.count({
          where: { assigneeId: userId, status: { in: ["TODO", "IN_PROGRESS"] } },
        }),
        prisma.task.count({
          where: {
            assigneeId: userId,
            status: { in: ["TODO", "IN_PROGRESS"] },
            dueDate: { lt: new Date() },
          },
        }),
        prisma.activity.findMany({
          where: { userId, ...baseWindow },
          orderBy: { createdAt: "desc" },
          take: 3,
          select: {
            id: true,
            type: true,
            title: true,
            createdAt: true,
            leadId: true,
            enquiryId: true,
            dealId: true,
          },
        }),
        prisma.leadNote.findMany({
          where: { agentId: userId, ...baseWindow },
          orderBy: { createdAt: "desc" },
          take: 3,
          include: { lead: { select: { id: true, leadNumber: true } } },
        }),
      ]);

      const stages = leadsByStage
        .sort((a, b) => b._count - a._count)
        .slice(0, 4)
        .map((g) => `${g.stage}: ${g._count}`)
        .join(" · ");
      const lastSeenText = user.lastSeen
        ? `Last seen ${relativeTime(user.lastSeen)}`
        : "Never seen";
      const windowSuffix = since
        ? ` in last ${params.daysAgo} day(s)`
        : "";

      const title = `${fmtPersonName(user)} — overview${windowSuffix}`;

      const headerText: AssistantResult = {
        kind: "text",
        text: `${user.role} · ${user.office} · ${user.email}\n${lastSeenText}${stages ? `\nStages → ${stages}` : ""}`,
      };

      const stats: AssistantResult = {
        kind: "list",
        title: "Stats",
        total: 5,
        items: [
          { title: `Leads: ${leadCount}`, href: `/leads?consultant=${userId}` },
          { title: `Clients: ${clientCount}`, href: `/clients?agent=${userId}` },
          { title: `Deals: ${dealCount} (won ${wonDealCount})`, href: `/deals` },
          { title: `Open tasks: ${openTasks}${overdueTasks ? ` (${overdueTasks} overdue)` : ""}`, href: `/tasks` },
        ],
      };

      const activitiesList: AssistantResult = recentActivities.length
        ? {
            kind: "list",
            title: "Recent activity",
            total: recentActivities.length,
            items: recentActivities.map((a) => ({
              title: `[${a.type}] ${a.title}`,
              subtitle: relativeTime(a.createdAt),
              href: a.leadId
                ? `/leads/${a.leadId}`
                : a.dealId
                  ? `/deals/${a.dealId}`
                  : a.enquiryId
                    ? `/clients/enquiries/${a.enquiryId}`
                    : "/notifications",
            })),
          }
        : { kind: "text", text: "No recent activity." };

      const notesList: AssistantResult = recentNotes.length
        ? {
            kind: "list",
            title: "Recent lead notes",
            total: recentNotes.length,
            items: recentNotes.map((n) => ({
              title: trim(n.content, 80),
              subtitle: `Lead ${n.lead.leadNumber} · ${relativeTime(n.createdAt)}`,
              href: `/leads/${n.lead.id}`,
            })),
          }
        : { kind: "text", text: "No recent notes." };

      return {
        kind: "compound",
        title,
        results: [headerText, stats, activitiesList, notesList],
      };
    }

    // ===== COUNTS =====
    case "count.leads": {
      const value = await prisma.lead.count();
      return { kind: "count", label: "Total leads", value, href: "/leads" };
    }
    case "count.clients": {
      const value = await prisma.client.count();
      return { kind: "count", label: "Total clients", value, href: "/clients" };
    }
    case "count.enquiries": {
      const value = await prisma.enquiry.count();
      return { kind: "count", label: "Total enquiries", value, href: "/clients/enquiries" };
    }
    case "count.deals": {
      const value = await prisma.deal.count();
      return { kind: "count", label: "Total deals", value, href: "/deals" };
    }

    case "freeform":
    default:
      return {
        kind: "text",
        text: invocation.reply?.trim() || "I'm not sure how to answer that yet.",
      };
  }
}

function trim(s: string, n: number): string {
  const clean = s.replace(/\s+/g, " ").trim();
  return clean.length > n ? clean.slice(0, n - 1) + "…" : clean;
}

async function listEnquiries(
  where: Record<string, unknown>,
  title: string,
  viewAllHref: string,
): Promise<AssistantResult> {
  const [rows, total] = await Promise.all([
    prisma.enquiry.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        status: true,
        refId: true,
        createdAt: true,
      },
    }),
    prisma.enquiry.count({ where }),
  ]);
  return {
    kind: "list",
    title: `${title} (${total})`,
    items: rows.map((e) => ({
      title: `${e.refId ?? e.id.slice(0, 8)} — ${e.firstName} ${e.lastName}`,
      subtitle: `${e.status} · ${relativeTime(e.createdAt)} · ${e.email}`,
      href: `/clients/enquiries/${e.id}`,
    })),
    total,
    viewAllHref,
  };
}

