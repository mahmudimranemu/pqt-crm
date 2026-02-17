"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth, type ExtendedSession } from "@/lib/auth";
import type {
  LeadStage,
  LeadSource,
  Currency,
  BudgetRange,
  SourceChannel,
  PropertyType,
} from "@prisma/client";
import { updateLeadScore, getSlaDeadline } from "@/lib/scoring";
import { notify } from "@/lib/notifications";
import { auditLog } from "@/lib/audit";

interface CreateLeadData {
  title: string;
  description?: string;
  stage?: LeadStage;
  estimatedValue?: number;
  currency?: Currency;
  budgetRange?: BudgetRange;
  source?: LeadSource;
  sourceChannel?: SourceChannel;
  sourceDetail?: string;
  propertyType?: PropertyType;
  preferredLocation?: string;
  clientId: string;
  ownerId?: string;
}

interface UpdateLeadData extends Partial<CreateLeadData> {
  id: string;
  score?: number;
  temperature?: string;
  slaDeadline?: string;
  lostReason?: string;
}

async function generateLeadNumber(): Promise<string> {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
  const prefix = `PQT-L-${dateStr}`;
  const count = await prisma.lead.count({
    where: { leadNumber: { startsWith: prefix } },
  });
  return `${prefix}-${String(count + 1).padStart(4, "0")}`;
}

export async function getLeads(params?: {
  search?: string;
  stage?: LeadStage;
  ownerId?: string;
  page?: number;
  limit?: number;
  tab?: string;
  tag?: string;
}) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  const {
    search,
    stage,
    ownerId,
    page = 1,
    limit = 50,
    tab,
    tag,
  } = params || {};
  const where: any = {};

  // SALES_AGENT can only see their own leads
  if (session.user.role === "SALES_AGENT") {
    where.ownerId = session.user.id;
  } else if (ownerId) {
    where.ownerId = ownerId;
  }

  if (stage) where.stage = stage;

  if (search) {
    where.AND = [
      ...(where.AND || []),
      {
        OR: [
          { title: { contains: search, mode: "insensitive" } },
          { leadNumber: { contains: search, mode: "insensitive" } },
          { client: { firstName: { contains: search, mode: "insensitive" } } },
          { client: { lastName: { contains: search, mode: "insensitive" } } },
          { client: { email: { contains: search, mode: "insensitive" } } },
          { client: { phone: { contains: search, mode: "insensitive" } } },
        ],
      },
    ];
  }

  // Tab-based filtering
  const now = new Date();
  if (tab === "48h") {
    where.createdAt = { gte: new Date(now.getTime() - 48 * 60 * 60 * 1000) };
  } else if (tab === "today") {
    where.nextCallDate = {
      gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
      lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
    };
  } else if (tab === "previous") {
    where.nextCallDate = {
      lt: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
    };
  } else if (tab === "future") {
    where.nextCallDate = {
      gt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
    };
  } else if (tab === "new") {
    where.stage = "NEW_ENQUIRY";
  } else if (tab === "tagged") {
    where.tags = { isEmpty: false };
  }

  // Tag filtering
  if (tag) {
    where.tags = { has: tag };
  }

  const [leads, total, futureCallCount] = await Promise.all([
    prisma.lead.findMany({
      where,
      include: {
        owner: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        notes: {
          orderBy: { createdAt: "desc" as const },
          take: 1,
          include: {
            agent: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
        _count: { select: { activities: true, tasks: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.lead.count({ where }),
    prisma.lead.count({
      where: {
        nextCallDate: {
          gt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
        },
      },
    }),
  ]);

  return {
    leads,
    total,
    futureCallCount,
    pages: Math.ceil(total / limit),
    currentPage: page,
  };
}

export async function getLeadsByStage() {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  const where: any = {};

  // SALES_AGENT can only see their own leads
  if (session.user.role === "SALES_AGENT") {
    where.ownerId = session.user.id;
  }

  const leads = await prisma.lead.findMany({
    where,
    include: {
      owner: { select: { id: true, firstName: true, lastName: true } },
      client: {
        select: { id: true, firstName: true, lastName: true, phone: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const stages: Record<string, typeof leads> = {};
  for (const lead of leads) {
    if (!stages[lead.stage]) stages[lead.stage] = [];
    stages[lead.stage].push(lead);
  }

  return stages;
}

export async function getLeadById(id: string) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  const lead = await prisma.lead.findUnique({
    where: { id },
    include: {
      owner: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
      client: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          whatsapp: true,
          nationality: true,
        },
      },
      convertedDeal: { select: { id: true, dealNumber: true, title: true } },
      interestedProperty: {
        select: { id: true, name: true, pqtNumber: true },
      },
      activities: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { user: { select: { firstName: true, lastName: true } } },
      },
      tasks: {
        orderBy: { dueDate: "asc" },
        include: { assignee: { select: { firstName: true, lastName: true } } },
      },
      notes: {
        orderBy: { createdAt: "desc" },
        include: {
          agent: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      },
    },
  });

  if (!lead) throw new Error("Lead not found");

  // SALES_AGENT can only view their own leads
  if (session.user.role === "SALES_AGENT" && lead.ownerId !== session.user.id) {
    throw new Error("Unauthorized");
  }

  return lead;
}

export async function createLead(data: CreateLeadData) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  const leadNumber = await generateLeadNumber();

  const lead = await prisma.lead.create({
    data: {
      leadNumber,
      title: data.title,
      description: data.description,
      stage: data.stage || "NEW_ENQUIRY",
      estimatedValue: data.estimatedValue,
      currency: data.currency || "USD",
      budgetRange: data.budgetRange,
      source: data.source,
      sourceChannel: data.sourceChannel,
      sourceDetail: data.sourceDetail,
      propertyType: data.propertyType,
      preferredLocation: data.preferredLocation,
      clientId: data.clientId,
      ownerId: data.ownerId || session.user.id,
    },
  });

  await prisma.activity.create({
    data: {
      type: "NOTE",
      title: "Lead Created",
      description: `Created lead: ${data.title}`,
      leadId: lead.id,
      clientId: data.clientId,
      userId: session.user.id,
    },
  });

  // Auto-calculate score and SLA deadline
  await updateLeadScore(lead.id);
  const slaDeadline = getSlaDeadline(null); // Default Medium priority
  await prisma.lead.update({
    where: { id: lead.id },
    data: { slaDeadline },
  });

  // Notify assigned owner
  if (data.ownerId && data.ownerId !== session.user.id) {
    await notify(
      data.ownerId,
      "LEAD_ASSIGNED",
      "New Lead Assigned",
      `You have been assigned lead: ${data.title}`,
      `/leads/${lead.id}`,
    );
  }

  await auditLog("CREATE", "Lead", lead.id, {
    clientId: data.clientId,
    source: data.source,
  });
  revalidatePath("/leads");
  return lead;
}

export async function updateLead(data: UpdateLeadData) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  const { id, slaDeadline, ...rest } = data;

  // SALES_AGENT can only update their own leads
  if (session.user.role === "SALES_AGENT") {
    const existing = await prisma.lead.findUnique({
      where: { id },
      select: { ownerId: true },
    });
    if (!existing || existing.ownerId !== session.user.id)
      throw new Error("Unauthorized");
  }

  const lead = await prisma.lead.update({
    where: { id },
    data: {
      ...rest,
      slaDeadline: slaDeadline ? new Date(slaDeadline) : undefined,
    },
  });

  revalidatePath("/leads");
  revalidatePath(`/leads/${id}`);
  return lead;
}

export async function updateLeadField(
  leadId: string,
  field: string,
  value: string | boolean | Date | null,
) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");
  if (session.user.role === "VIEWER") throw new Error("Unauthorized");

  // SALES_AGENT can only update their own leads
  if (session.user.role === "SALES_AGENT") {
    const existing = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { ownerId: true },
    });
    if (!existing || existing.ownerId !== session.user.id)
      throw new Error("Unauthorized");
  }

  const allowedFields = [
    "called",
    "spoken",
    "segment",
    "priority",
    "nextCallDate",
    "snooze",
    "ownerId",
    "interestedPropertyId",
    "description",
    "preferredLocation",
    "temperature",
    "lostReason",
  ];

  if (!allowedFields.includes(field)) {
    throw new Error(`Field '${field}' is not editable`);
  }

  const lead = await prisma.lead.update({
    where: { id: leadId },
    data: { [field]: value },
  });

  // Re-score when scoring-relevant fields change
  const scoringFields = [
    "called",
    "spoken",
    "segment",
    "priority",
    "interestedPropertyId",
  ];
  if (scoringFields.includes(field)) {
    await updateLeadScore(leadId);
  }

  // Update SLA deadline when priority changes
  if (field === "priority" && typeof value === "string") {
    const slaDeadline = getSlaDeadline(value);
    await prisma.lead.update({
      where: { id: leadId },
      data: { slaDeadline },
    });
  }

  // Notify new owner when reassigned
  if (field === "ownerId" && typeof value === "string") {
    const session2 = (await auth()) as ExtendedSession | null;
    if (value !== session2?.user?.id) {
      await notify(
        value,
        "LEAD_ASSIGNED",
        "Lead Reassigned to You",
        `A lead has been reassigned to you`,
        `/leads/${leadId}`,
      );
    }
  }

  revalidatePath("/leads");
  revalidatePath(`/leads/${leadId}`);
  return lead;
}

export async function updateLeadTags(leadId: string, tags: string[]) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");
  if (session.user.role === "VIEWER") throw new Error("Unauthorized");

  // SALES_AGENT can only update their own leads
  if (session.user.role === "SALES_AGENT") {
    const existing = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { ownerId: true },
    });
    if (!existing || existing.ownerId !== session.user.id)
      throw new Error("Unauthorized");
  }

  const lead = await prisma.lead.update({
    where: { id: leadId },
    data: { tags },
  });

  revalidatePath("/leads");
  revalidatePath(`/leads/${leadId}`);
  return lead;
}

export async function updateLeadStage(id: string, stage: LeadStage) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  // SALES_AGENT can only update their own leads
  if (session.user.role === "SALES_AGENT") {
    const existing = await prisma.lead.findUnique({
      where: { id },
      select: { ownerId: true },
    });
    if (!existing || existing.ownerId !== session.user.id)
      throw new Error("Unauthorized");
  }

  const lead = await prisma.lead.update({
    where: { id },
    data: { stage },
  });

  await prisma.activity.create({
    data: {
      type: "STAGE_CHANGE",
      title: "Stage Changed",
      description: `Lead stage changed to ${stage}`,
      leadId: id,
      clientId: lead.clientId,
      userId: session.user.id,
    },
  });

  await auditLog("STAGE_CHANGE", "Lead", id, { stage });
  revalidatePath("/leads");
  return lead;
}

export async function deleteLead(id: string) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  if (!["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) {
    throw new Error("No permission to delete leads");
  }

  await prisma.lead.delete({ where: { id } });
  await auditLog("DELETE", "Lead", id);
  revalidatePath("/leads");
}

export async function getLeadStats() {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  const viewAll = ["SUPER_ADMIN", "ADMIN", "SALES_MANAGER"].includes(
    session.user.role,
  );
  const where: any = viewAll ? {} : { ownerId: session.user.id };

  const [total, byStage, avgScore, recentLeads] = await Promise.all([
    prisma.lead.count({ where }),
    prisma.lead.groupBy({
      by: ["stage"],
      where,
      _count: true,
    }),
    prisma.lead.aggregate({
      where,
      _avg: { score: true },
    }),
    prisma.lead.count({
      where: {
        ...where,
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    }),
  ]);

  return {
    total,
    byStage: Object.fromEntries(byStage.map((s) => [s.stage, s._count])),
    avgScore: Math.round(avgScore._avg.score || 0),
    newThisWeek: recentLeads,
  };
}

export async function getLeadAnalytics() {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  const viewAll = ["SUPER_ADMIN", "ADMIN", "SALES_MANAGER"].includes(
    session.user.role,
  );
  const ownerFilter: any = viewAll ? {} : { ownerId: session.user.id };

  const now = new Date();
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const data: { month: string; leads: number; conversions: number }[] = [];

  for (let i = 11; i >= 0; i--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthStart = new Date(
      monthDate.getFullYear(),
      monthDate.getMonth(),
      1,
    );
    const monthEnd = new Date(
      monthDate.getFullYear(),
      monthDate.getMonth() + 1,
      0,
      23,
      59,
      59,
    );

    const [leads, conversions] = await Promise.all([
      prisma.lead.count({
        where: {
          ...ownerFilter,
          createdAt: { gte: monthStart, lte: monthEnd },
        },
      }),
      prisma.lead.count({
        where: {
          ...ownerFilter,
          createdAt: { gte: monthStart, lte: monthEnd },
          stage: { in: ["WON", "OFFER_MADE", "NEGOTIATING"] },
        },
      }),
    ]);

    data.push({
      month: monthNames[monthDate.getMonth()],
      leads,
      conversions,
    });
  }

  return data;
}

export async function addLeadNote(leadId: string, content: string) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");
  if (session.user.role === "VIEWER") throw new Error("Unauthorized");

  if (!content.trim()) throw new Error("Note content is required");

  const agent = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true },
  });
  if (!agent)
    throw new Error("Session expired. Please log out and log back in.");

  const note = await prisma.leadNote.create({
    data: {
      leadId,
      agentId: agent.id,
      content: content.trim(),
    },
    include: {
      agent: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  });

  revalidatePath(`/leads/${leadId}`);
  return note;
}

export async function addLeadContactLog(
  leadId: string,
  data: { contactType: "CALL" | "EMAIL" | "SPOKEN" | "NOTE"; content: string },
) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");
  if (session.user.role === "VIEWER") throw new Error("Unauthorized");

  if (!data.content.trim()) throw new Error("Note content is required");

  const agent = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, firstName: true, lastName: true },
  });
  if (!agent)
    throw new Error("Session expired. Please log out and log back in.");

  // Prefix the note content with the contact type
  const prefixedContent =
    data.contactType === "NOTE"
      ? data.content.trim()
      : `[${data.contactType}] ${data.content.trim()}`;

  // Create the note
  const note = await prisma.leadNote.create({
    data: {
      leadId,
      agentId: agent.id,
      content: prefixedContent,
    },
    include: {
      agent: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  });

  // Update called/spoken flags on the lead
  const updateData: { called?: boolean; spoken?: boolean } = {};
  if (data.contactType === "CALL") updateData.called = true;
  if (data.contactType === "SPOKEN") updateData.spoken = true;

  if (Object.keys(updateData).length > 0) {
    await prisma.lead.update({
      where: { id: leadId },
      data: updateData,
    });
  }

  // Log activity
  const activityTypeMap: Record<string, "CALL" | "EMAIL" | "NOTE"> = {
    CALL: "CALL",
    EMAIL: "EMAIL",
    SPOKEN: "CALL",
    NOTE: "NOTE",
  };

  await prisma.activity.create({
    data: {
      type: activityTypeMap[data.contactType],
      title: `${data.contactType.charAt(0) + data.contactType.slice(1).toLowerCase()} logged`,
      description: data.content.trim(),
      leadId,
      userId: agent.id,
    },
  });

  revalidatePath(`/leads/${leadId}`);
  return note;
}

export async function deleteLeadNote(noteId: string) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  const note = await prisma.leadNote.findUnique({ where: { id: noteId } });
  if (!note) throw new Error("Note not found");

  if (
    note.agentId !== session.user.id &&
    session.user.role !== "SUPER_ADMIN" &&
    session.user.role !== "ADMIN"
  ) {
    throw new Error("Unauthorized");
  }

  await prisma.leadNote.delete({ where: { id: noteId } });
  revalidatePath(`/leads/${note.leadId}`);
}

export async function getAgentsForLeads() {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  return prisma.user.findMany({
    where: {
      isActive: true,
      role: { in: ["SALES_AGENT", "SALES_MANAGER", "ADMIN"] },
    },
    select: { id: true, firstName: true, lastName: true },
    orderBy: { firstName: "asc" },
  });
}

export async function convertLeadToDeal(
  leadId: string,
  dealData: {
    title: string;
    dealValue: number;
    currency?: Currency;
    propertyType?: PropertyType;
    propertyName?: string;
    unitNumber?: string;
    expectedCloseDate?: string;
  },
) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) throw new Error("Lead not found");
  if (lead.convertedDealId) throw new Error("Lead already converted");

  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
  const prefix = `PQT-D-${dateStr}`;
  const count = await prisma.deal.count({
    where: { dealNumber: { startsWith: prefix } },
  });
  const dealNumber = `${prefix}-${String(count + 1).padStart(4, "0")}`;

  const deal = await prisma.deal.create({
    data: {
      dealNumber,
      title: dealData.title,
      dealValue: dealData.dealValue,
      currency: dealData.currency || "USD",
      propertyType: dealData.propertyType || lead.propertyType,
      propertyName: dealData.propertyName,
      unitNumber: dealData.unitNumber,
      expectedCloseDate: dealData.expectedCloseDate
        ? new Date(dealData.expectedCloseDate)
        : null,
      clientId: lead.clientId,
      ownerId: lead.ownerId,
    },
  });

  await prisma.lead.update({
    where: { id: leadId },
    data: {
      stage: "WON",
      convertedDealId: deal.id,
    },
  });

  await prisma.activity.create({
    data: {
      type: "STAGE_CHANGE",
      title: "Lead Converted to Deal",
      description: `Lead converted to deal ${dealNumber}`,
      leadId,
      dealId: deal.id,
      clientId: lead.clientId,
      userId: session.user.id,
    },
  });

  revalidatePath("/leads");
  revalidatePath("/deals");
  return deal;
}

export async function assignLeadToPool(
  leadId: string,
  pool: "POOL_1" | "POOL_2" | "POOL_3",
) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");
  if (session.user.role === "VIEWER") throw new Error("Unauthorized");

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: { tags: true },
  });
  if (!lead) throw new Error("Lead not found");

  const filteredTags = lead.tags.filter(
    (t) => t !== "POOL_1" && t !== "POOL_2" && t !== "POOL_3",
  );
  filteredTags.push(pool);

  await prisma.lead.update({
    where: { id: leadId },
    data: { tags: filteredTags },
  });

  revalidatePath("/leads");
  revalidatePath("/settings/users");
}

export async function removeLeadFromPool(leadId: string) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");
  if (session.user.role === "VIEWER") throw new Error("Unauthorized");

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: { tags: true },
  });
  if (!lead) throw new Error("Lead not found");

  const filteredTags = lead.tags.filter(
    (t) => t !== "POOL_1" && t !== "POOL_2" && t !== "POOL_3",
  );

  await prisma.lead.update({
    where: { id: leadId },
    data: { tags: filteredTags },
  });

  revalidatePath("/leads");
  revalidatePath("/settings/users");
}
