"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { auth, type ExtendedSession } from "@/lib/auth";
import type {
  EnquiryStatus,
  EnquirySource,
  LeadSource,
  BudgetRange,
  PropertyType,
} from "@prisma/client";
import { auditLog } from "@/lib/audit";
import { notify, notifySuperAdmins, notifyUserAndAdmins } from "@/lib/notifications";

export async function getEnquiries(params?: {
  status?: EnquiryStatus;
  source?: EnquirySource;
  agentId?: string;
  page?: number;
  limit?: number;
  tab?: string;
  tag?: string;
  search?: string;
}) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  const {
    status,
    source,
    agentId,
    page = 1,
    limit = 25,
    tab,
    tag,
    search,
  } = params || {};
  const skip = (page - 1) * limit;

  const where: any = {};

  // Role-based filtering: only SUPER_ADMIN sees all, others see only their own
  if (session.user.role !== "SUPER_ADMIN") {
    where.assignedAgentId = session.user.id;
  }

  if (status) where.status = status;
  if (source) where.source = source;
  if (agentId) where.assignedAgentId = agentId;

  // Tab-based filtering
  const now = new Date();
  const past48h = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  if (tab === "48h") {
    // Show enquiries with activity within last 48 hours:
    // notes added, nextCallDate falls in window, or newly created
    where.AND = [
      ...(where.AND || []),
      {
        OR: [
          { nextCallDate: { gte: past48h, lte: now } },
          { notes: { some: { createdAt: { gte: past48h } } } },
          { createdAt: { gte: past48h } },
        ],
      },
    ];
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
      gte: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
    };
  } else if (tab === "new") {
    where.status = "NEW";
  } else if (tab === "tagged") {
    where.tags = { isEmpty: false };
  }

  // Tag filtering
  if (tag) {
    where.tags = { has: tag };
  }

  // Search filtering
  if (search) {
    where.AND = [
      ...(where.AND || []),
      {
        OR: [
          { firstName: { contains: search, mode: "insensitive" } },
          { lastName: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          { phone: { contains: search, mode: "insensitive" } },
        ],
      },
    ];
  }

  const [enquiries, total, newCount, futureCallCount] = await Promise.all([
    prisma.enquiry.findMany({
      where,
      include: {
        assignedAgent: {
          select: { id: true, firstName: true, lastName: true },
        },
        convertedClient: {
          select: { id: true, firstName: true, lastName: true },
        },
        notes: {
          select: {
            id: true,
            content: true,
            createdAt: true,
            agent: {
              select: { firstName: true, lastName: true },
            },
          },
          orderBy: { createdAt: "desc" as const },
          take: 1,
        },
      },
      orderBy:
        tab === "today" || tab === "future"
          ? { nextCallDate: "asc" as const }
          : tab === "previous"
            ? { nextCallDate: "desc" as const }
            : tab === "48h"
              ? { updatedAt: "desc" as const }
              : { createdAt: "desc" as const },
      skip,
      take: limit,
    }),
    prisma.enquiry.count({ where }),
    prisma.enquiry.count({
      where: {
        ...(session.user.role === "SALES_AGENT"
          ? {
              OR: [
                { assignedAgentId: session.user.id },
                { assignedAgentId: null },
              ],
            }
          : {}),
        status: "NEW",
      },
    }),
    prisma.enquiry.count({
      where: {
        ...(session.user.role === "SALES_AGENT"
          ? {
              OR: [
                { assignedAgentId: session.user.id },
                { assignedAgentId: null },
              ],
            }
          : {}),
        nextCallDate: {
          gt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
        },
      },
    }),
  ]);

  return {
    enquiries,
    total,
    newCount,
    futureCallCount,
    pages: Math.ceil(total / limit),
    currentPage: page,
  };
}

export async function getEnquiriesByStatus() {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  const statuses: EnquiryStatus[] = [
    "NEW",
    "ASSIGNED",
    "CONTACTED",
    "CONVERTED_TO_CLIENT",
    "SPAM",
    "CLOSED",
  ];

  const where: Record<string, unknown> =
    session.user.role !== "SUPER_ADMIN"
      ? { assignedAgentId: session.user.id }
      : {};

  const enquiries = await prisma.enquiry.findMany({
    where,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      status: true,
      source: true,
      budget: true,
      country: true,
      priority: true,
      tags: true,
      createdAt: true,
      assignedAgent: {
        select: { id: true, firstName: true, lastName: true },
      },
      interestedProperty: {
        select: { id: true, name: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const grouped: Record<string, typeof enquiries> = {};
  for (const status of statuses) {
    grouped[status] = [];
  }
  for (const enquiry of enquiries) {
    if (grouped[enquiry.status]) {
      grouped[enquiry.status].push(enquiry);
    }
  }

  return grouped;
}

export async function getEnquiry(id: string) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  const enquiry = await prisma.enquiry.findUnique({
    where: { id },
    include: {
      assignedAgent: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
      convertedClient: true,
      interestedProperty: {
        select: { id: true, name: true, pqtNumber: true },
      },
      notes: {
        include: {
          agent: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      activities: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          user: {
            select: { firstName: true, lastName: true },
          },
        },
      },
    },
  });

  // SALES_AGENT can only view enquiries assigned to them
  if (
    session.user.role === "SALES_AGENT" &&
    enquiry?.assignedAgentId &&
    enquiry.assignedAgentId !== session.user.id
  ) {
    throw new Error("Unauthorized");
  }

  return enquiry;
}

export interface CreateEnquiryData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  message?: string;
  source: string;
  budget?: string;
  country?: string;
  segment?: string;
  priority?: string;
  assignedAgentId?: string;
  interestedPropertyId?: string;
}

export async function createEnquiry(data: CreateEnquiryData) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");
  if (session.user.role === "VIEWER") throw new Error("Unauthorized");

  // Auto-assign if no agent specified
  let assignedAgentId = data.assignedAgentId || null;
  if (!assignedAgentId) {
    try {
      const { autoAssignEnquiry } = await import("@/lib/lead-routing");
      // We'll create first then auto-assign
    } catch {
      // Lead routing not critical
    }
  }

  const enquiry = await prisma.enquiry.create({
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      message: data.message || null,
      source: (data.source || "WEBSITE_FORM") as EnquirySource,
      budget: data.budget || null,
      country: data.country || null,
      segment: data.segment || "Buyer",
      priority: data.priority || "Medium",
      assignedAgentId: assignedAgentId,
      interestedPropertyId: data.interestedPropertyId || null,
      status: assignedAgentId ? "ASSIGNED" : "NEW",
    },
  });

  // Auto-assign via routing if no agent was manually set
  if (!assignedAgentId) {
    try {
      const { autoAssignEnquiry } = await import("@/lib/lead-routing");
      await autoAssignEnquiry(enquiry.id, data.country);
    } catch {
      // Lead routing is non-critical
    }
  }

  await auditLog("CREATE", "Enquiry", enquiry.id, {
    subject: data.firstName + " " + data.lastName,
    clientId: data.email,
  });

  // Notify super admins about new enquiry
  await notifySuperAdmins(
    "SYSTEM_ALERT",
    "New Enquiry Received",
    `${data.firstName} ${data.lastName} (${data.email}) submitted an enquiry`,
    "/clients/enquiries",
  );

  // Notify assigned agent if any
  if (assignedAgentId && assignedAgentId !== session.user.id) {
    await notify(
      assignedAgentId,
      "LEAD_ASSIGNED",
      "Enquiry Assigned to You",
      `New enquiry from ${data.firstName} ${data.lastName}`,
      "/clients/enquiries",
    );
  }

  revalidatePath("/clients/enquiries");
  return enquiry;
}

export async function bulkCreateEnquiries(
  rows: Array<{
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    message?: string;
    source?: string;
    sourceUrl?: string;
    budget?: string;
    country?: string;
    tags?: string;
    segment?: string;
    leadStatus?: string;
    priority?: string;
    nextCallDate?: string;
    snooze?: string;
  }>,
) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");
  if (session.user.role === "VIEWER") throw new Error("Unauthorized");

  if (!rows.length) throw new Error("No data to import");

  const validSources = [
    "WEBSITE_FORM",
    "PHONE_CALL",
    "EMAIL",
    "WHATSAPP",
    "LIVE_CHAT",
    "PARTNER_REFERRAL",
  ];

  const validPriorities = ["High", "Medium", "Low"];
  const validSegments = ["Buyer", "Investor", "Renter", "Other"];
  const validSnooze = ["Active", "1 Day", "3 Days", "1 Week", "1 Month"];

  const data = rows.map((row) => ({
    firstName: row.firstName.trim(),
    lastName: row.lastName.trim(),
    email: row.email.trim(),
    phone: row.phone.trim(),
    message: row.message?.trim() || null,
    source: (validSources.includes(row.source || "")
      ? row.source
      : "WEBSITE_FORM") as EnquirySource,
    sourceUrl: row.sourceUrl?.trim() || null,
    budget: row.budget?.trim() || null,
    country: row.country?.trim() || null,
    tags: row.tags ? row.tags.split(";").map((t) => t.trim()).filter(Boolean) : [],
    segment: row.segment?.trim() && validSegments.includes(row.segment.trim()) ? row.segment.trim() : "Buyer",
    leadStatus: row.leadStatus?.trim() || "New",
    priority: row.priority?.trim() && validPriorities.includes(row.priority.trim()) ? row.priority.trim() : "Medium",
    nextCallDate: row.nextCallDate?.trim() ? new Date(row.nextCallDate.trim()) : null,
    snooze: row.snooze?.trim() && validSnooze.includes(row.snooze.trim()) ? row.snooze.trim() : "Active",
    assignedAgentId: session.user.id,
    status: "ASSIGNED" as const,
  }));

  const result = await prisma.enquiry.createMany({ data });

  revalidatePath("/clients/enquiries");
  return { count: result.count };
}

export async function bulkAssignEnquiries(ids: string[], agentId: string) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");
  if (session.user.role !== "SUPER_ADMIN") throw new Error("Only Super Admin can bulk assign");

  await prisma.enquiry.updateMany({
    where: { id: { in: ids } },
    data: {
      assignedAgentId: agentId || null,
      status: agentId ? "ASSIGNED" : "NEW",
    },
  });

  if (agentId && agentId !== session.user.id) {
    await notify(
      agentId,
      "LEAD_ASSIGNED",
      "Enquiries Assigned to You",
      `${ids.length} enquiry(ies) have been assigned to you`,
      `/clients/enquiries`,
    );
  }

  revalidatePath("/clients/enquiries");
  return { count: ids.length };
}

export async function assignEnquiry(enquiryId: string, agentId: string) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");
  if (session.user.role === "VIEWER") throw new Error("Unauthorized");

  const enquiry = await prisma.enquiry.update({
    where: { id: enquiryId },
    data: {
      assignedAgentId: agentId,
      status: "ASSIGNED",
    },
  });

  await auditLog("ASSIGN", "Enquiry", enquiryId, { assignedAgentId: agentId });

  // Notify the assigned agent
  if (agentId !== session.user.id) {
    await notify(
      agentId,
      "LEAD_ASSIGNED",
      "Enquiry Assigned to You",
      `An enquiry has been assigned to you`,
      `/clients/enquiries`,
    );
  }

  revalidatePath("/clients/enquiries");
  return enquiry;
}

export async function updateEnquiryStatus(
  enquiryId: string,
  status: EnquiryStatus,
) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");
  if (session.user.role === "VIEWER") throw new Error("Unauthorized");

  // SALES_AGENT can only update enquiries assigned to them
  if (session.user.role === "SALES_AGENT") {
    const existing = await prisma.enquiry.findUnique({
      where: { id: enquiryId },
      select: { assignedAgentId: true },
    });
    if (
      !existing ||
      (existing.assignedAgentId && existing.assignedAgentId !== session.user.id)
    )
      throw new Error("Unauthorized");
  }

  const enquiry = await prisma.enquiry.update({
    where: { id: enquiryId },
    data: { status },
  });

  await auditLog("STAGE_CHANGE", "Enquiry", enquiryId, { status });

  revalidatePath("/clients/enquiries");
  return enquiry;
}

// Map EnquirySource to LeadSource
function mapEnquirySourceToLeadSource(source: EnquirySource): LeadSource {
  const mapping: Record<EnquirySource, LeadSource> = {
    WEBSITE_FORM: "WEBSITE",
    PHONE_CALL: "OTHER",
    EMAIL: "OTHER",
    WHATSAPP: "SOCIAL_MEDIA",
    LIVE_CHAT: "WEBSITE",
    PARTNER_REFERRAL: "PARTNER",
  };
  return mapping[source];
}

export interface ConvertEnquiryData {
  // Client fields
  nationality?: string;
  country?: string;
  budgetMin?: number;
  budgetMax?: number;
  investmentPurpose?: string;
  // Lead fields
  leadTitle: string;
  estimatedValue?: number;
  budgetRange?: BudgetRange;
  propertyType?: PropertyType;
  preferredLocation?: string;
  description?: string;
}

export async function convertToClientAndLead(
  enquiryId: string,
  data: ConvertEnquiryData,
) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");
  if (session.user.role === "VIEWER") throw new Error("Unauthorized");

  const enquiry = await prisma.enquiry.findUnique({
    where: { id: enquiryId },
  });

  if (!enquiry) throw new Error("Enquiry not found");
  if (enquiry.convertedClientId) throw new Error("Already converted");

  // Generate lead number
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
  const todayStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const count = await prisma.lead.count({
    where: { createdAt: { gte: todayStart } },
  });
  const leadNumber = `PQT-L-${dateStr}-${String(count + 1).padStart(4, "0")}`;

  const ownerId = enquiry.assignedAgentId || session.user.id;
  const leadSource = mapEnquirySourceToLeadSource(enquiry.source);

  // Run everything in a transaction
  const result = await prisma.$transaction(async (tx) => {
    // 1. Create Client
    const client = await tx.client.create({
      data: {
        firstName: enquiry.firstName,
        lastName: enquiry.lastName,
        email: enquiry.email,
        phone: enquiry.phone,
        nationality: data.nationality || enquiry.country || "Not specified",
        country: data.country || enquiry.country || "Not specified",
        budgetMin: data.budgetMin || 200000,
        budgetMax: data.budgetMax || 500000,
        source: leadSource,
        status: "NEW_LEAD",
        investmentPurpose: (data.investmentPurpose || "RESIDENTIAL") as any,
        assignedAgentId: ownerId,
        notes: enquiry.message || undefined,
      },
    });

    // 2. Create Lead linked to the new Client
    const lead = await tx.lead.create({
      data: {
        leadNumber,
        title: data.leadTitle,
        description: data.description || enquiry.message || undefined,
        stage: "NEW_ENQUIRY",
        estimatedValue: data.estimatedValue || undefined,
        budgetRange: data.budgetRange || undefined,
        source: leadSource,
        sourceDetail: enquiry.sourceUrl || undefined,
        propertyType: data.propertyType || undefined,
        preferredLocation: data.preferredLocation || undefined,
        clientId: client.id,
        ownerId,
      },
    });

    // 3. Create Activity on the lead
    await tx.activity.create({
      data: {
        type: "NOTE",
        title: "Lead Created from Enquiry",
        description: `Converted from enquiry for ${enquiry.firstName} ${enquiry.lastName}. Original source: ${enquiry.source}.`,
        leadId: lead.id,
        clientId: client.id,
        userId: session.user.id,
      },
    });

    // 4. Update Enquiry status
    await tx.enquiry.update({
      where: { id: enquiryId },
      data: {
        status: "CONVERTED_TO_CLIENT",
        convertedClientId: client.id,
      },
    });

    return { client, lead };
  });

  // Notify super admins about conversion
  await notifySuperAdmins(
    "DEAL_STAGE_CHANGED",
    "Enquiry Converted to Client & Lead",
    `${enquiry.firstName} ${enquiry.lastName} has been converted to a client and lead`,
    `/leads/${result.lead.id}`,
  );

  revalidatePath("/clients/enquiries");
  revalidatePath("/clients");
  revalidatePath("/leads");
  return result;
}

// Keep old function for backward compatibility but have it use the new one
export async function convertToClient(
  enquiryId: string,
  additionalData?: {
    budgetMin?: number;
    budgetMax?: number;
    nationality?: string;
    country?: string;
  },
) {
  const enquiry = await prisma.enquiry.findUnique({
    where: { id: enquiryId },
  });
  if (!enquiry) throw new Error("Enquiry not found");

  return convertToClientAndLead(enquiryId, {
    nationality: additionalData?.nationality,
    country: additionalData?.country,
    budgetMin: additionalData?.budgetMin,
    budgetMax: additionalData?.budgetMax,
    leadTitle: `${enquiry.firstName} ${enquiry.lastName} - New Opportunity`,
  });
}

export async function updateEnquiryField(
  enquiryId: string,
  field: string,
  value: string | string[] | boolean | Date | null,
) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");
  if (session.user.role === "VIEWER") throw new Error("Unauthorized");

  // SALES_AGENT can only update enquiries assigned to them
  if (session.user.role === "SALES_AGENT") {
    const existing = await prisma.enquiry.findUnique({
      where: { id: enquiryId },
      select: { assignedAgentId: true },
    });
    if (
      !existing ||
      (existing.assignedAgentId && existing.assignedAgentId !== session.user.id)
    )
      throw new Error("Unauthorized");
  }

  const allowedFields = [
    "called",
    "spoken",
    "segment",
    "leadStatus",
    "priority",
    "nextCallDate",
    "snooze",
    "budget",
    "country",
    "tags",
    "assignedAgentId",
    "interestedPropertyId",
  ];

  if (!allowedFields.includes(field)) {
    throw new Error(`Field '${field}' is not editable`);
  }

  const enquiry = await prisma.enquiry.update({
    where: { id: enquiryId },
    data: { [field]: value },
  });

  // Log activity for nextCallDate changes
  if (field === "nextCallDate") {
    const dateDisplay = value
      ? new Date(value as string | Date).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "cleared";
    await prisma.activity.create({
      data: {
        type: "FOLLOW_UP",
        title: "Next Call Date Updated",
        description: `Next call date ${value ? `set to ${dateDisplay}` : "cleared"}`,
        enquiryId,
        userId: session.user.id,
      },
    });
  }

  await auditLog("UPDATE", "Enquiry", enquiryId, { [field]: value } as Record<
    string,
    unknown
  >);

  revalidatePath("/clients/enquiries");
  revalidatePath(`/clients/enquiries/${enquiryId}`);
  return enquiry;
}

export async function getAgents() {
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

export async function markAsSpam(enquiryId: string) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");
  if (session.user.role === "VIEWER") throw new Error("Unauthorized");

  // SALES_AGENT can only mark their own enquiries as spam
  if (session.user.role === "SALES_AGENT") {
    const existing = await prisma.enquiry.findUnique({
      where: { id: enquiryId },
      select: { assignedAgentId: true },
    });
    if (
      !existing ||
      (existing.assignedAgentId && existing.assignedAgentId !== session.user.id)
    )
      throw new Error("Unauthorized");
  }

  const enquiry = await prisma.enquiry.update({
    where: { id: enquiryId },
    data: { status: "SPAM" },
  });

  revalidatePath("/clients/enquiries");
  return enquiry;
}

export async function deleteEnquiry(id: string) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");
  if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  await prisma.$transaction(async (tx) => {
    await tx.activity.deleteMany({ where: { enquiryId: id } });
    await tx.enquiryNote.deleteMany({ where: { enquiryId: id } });
    await tx.enquiry.delete({ where: { id } });
  }, { timeout: 30000 });
  await auditLog("DELETE", "Enquiry", id);
  revalidatePath("/clients/enquiries");
}

export async function getActiveProperties() {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  return prisma.property.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, name: true, pqtNumber: true },
    orderBy: { name: "asc" },
  });
}

export async function addEnquiryNote(enquiryId: string, content: string) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");
  if (session.user.role === "VIEWER") throw new Error("Unauthorized");

  if (!content.trim()) throw new Error("Note content is required");

  // Verify the agent exists in the database
  const agent = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true },
  });
  if (!agent)
    throw new Error("Session expired. Please log out and log back in.");

  const note = await prisma.enquiryNote.create({
    data: {
      enquiryId,
      agentId: agent.id,
      content: content.trim(),
    },
    include: {
      agent: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  });

  revalidatePath(`/clients/enquiries/${enquiryId}`);
  return note;
}

export async function addEnquiryContactLog(
  enquiryId: string,
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
  const note = await prisma.enquiryNote.create({
    data: {
      enquiryId,
      agentId: agent.id,
      content: prefixedContent,
    },
    include: {
      agent: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  });

  // Update called/spoken flags on the enquiry
  const updateData: { called?: boolean; spoken?: boolean } = {};
  if (data.contactType === "CALL") updateData.called = true;
  if (data.contactType === "SPOKEN") updateData.spoken = true;

  if (Object.keys(updateData).length > 0) {
    await prisma.enquiry.update({
      where: { id: enquiryId },
      data: updateData,
    });
  }

  revalidatePath(`/clients/enquiries/${enquiryId}`);
  return note;
}

export async function deleteEnquiryNote(noteId: string) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  const note = await prisma.enquiryNote.findUnique({ where: { id: noteId } });
  if (!note) throw new Error("Note not found");

  // Only the author or admins can delete notes
  if (
    note.agentId !== session.user.id &&
    session.user.role !== "SUPER_ADMIN" &&
    session.user.role !== "ADMIN"
  ) {
    throw new Error("Unauthorized");
  }

  await prisma.enquiryNote.delete({ where: { id: noteId } });
  revalidatePath(`/clients/enquiries/${note.enquiryId}`);
}

export async function updateEnquiryTags(enquiryId: string, tags: string[]) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");
  if (session.user.role === "VIEWER") throw new Error("Unauthorized");

  // SALES_AGENT can only update tags on enquiries assigned to them
  if (session.user.role === "SALES_AGENT") {
    const existing = await prisma.enquiry.findUnique({
      where: { id: enquiryId },
      select: { assignedAgentId: true },
    });
    if (
      !existing ||
      (existing.assignedAgentId && existing.assignedAgentId !== session.user.id)
    )
      throw new Error("Unauthorized");
  }

  const enquiry = await prisma.enquiry.update({
    where: { id: enquiryId },
    data: { tags },
  });

  revalidatePath("/clients/enquiries");
  revalidatePath("/clients/enquiries/" + enquiryId);
  return enquiry;
}

export async function assignEnquiryToPool(
  enquiryId: string,
  pool: "POOL_1" | "POOL_2" | "POOL_3",
) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");
  if (session.user.role === "VIEWER") throw new Error("Unauthorized");

  const enquiry = await prisma.enquiry.findUnique({
    where: { id: enquiryId },
    select: { tags: true },
  });
  if (!enquiry) throw new Error("Enquiry not found");

  const filteredTags = enquiry.tags.filter(
    (t) => t !== "POOL_1" && t !== "POOL_2" && t !== "POOL_3",
  );
  filteredTags.push(pool);

  await prisma.enquiry.update({
    where: { id: enquiryId },
    data: { tags: filteredTags, assignedAgentId: null },
  });

  revalidatePath("/clients/enquiries");
  revalidatePath("/settings/users");
}

export async function removeEnquiryFromPool(enquiryId: string) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");
  if (session.user.role === "VIEWER") throw new Error("Unauthorized");

  const enquiry = await prisma.enquiry.findUnique({
    where: { id: enquiryId },
    select: { tags: true },
  });
  if (!enquiry) throw new Error("Enquiry not found");

  const filteredTags = enquiry.tags.filter(
    (t) => t !== "POOL_1" && t !== "POOL_2" && t !== "POOL_3",
  );

  await prisma.enquiry.update({
    where: { id: enquiryId },
    data: { tags: filteredTags },
  });

  revalidatePath("/clients/enquiries");
  revalidatePath("/settings/users");
}

export async function bulkDeleteEnquiries(ids: string[]) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");
  if (session.user.role !== "SUPER_ADMIN")
    throw new Error("Unauthorized: Only SUPER_ADMIN can bulk delete");

  await prisma.$transaction(async (tx) => {
    await tx.activity.deleteMany({ where: { enquiryId: { in: ids } } });
    await tx.enquiryNote.deleteMany({ where: { enquiryId: { in: ids } } });
    await tx.enquiry.deleteMany({ where: { id: { in: ids } } });
  }, { timeout: 30000 });

  revalidatePath("/clients/enquiries");
}

/**
 * Sync form submissions from the website (Payload CMS).
 * Fetches recent submissions and creates CRM enquiries for new ones.
 */
export async function syncWebsiteSubmissions(): Promise<{
  success: boolean;
  created: number;
  skipped: number;
  errors: number;
  message: string;
}> {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");
  if (!["SUPER_ADMIN", "ADMIN", "SALES_MANAGER"].includes(session.user.role)) {
    throw new Error("Unauthorized: Insufficient permissions");
  }

  const PAYLOAD_URL =
    process.env.PAYLOAD_CMS_URL || "https://propertyquestturkey.com";
  const PAYLOAD_API_KEY = process.env.PAYLOAD_CMS_API_KEY || "";

  // Fetch submissions from Payload CMS
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (PAYLOAD_API_KEY) {
    headers["Authorization"] = `users API-Key ${PAYLOAD_API_KEY}`;
  }

  let data: {
    docs: Array<{
      id: number;
      form: { id: number; title: string } | number;
      submissionData: { field: string; value: string }[];
      createdAt: string;
    }>;
  };

  try {
    const res = await fetch(
      `${PAYLOAD_URL}/api/form-submissions?limit=50&sort=-createdAt&depth=1`,
      { headers, cache: "no-store" },
    );

    if (!res.ok) {
      // Try without auth (some Payload configs allow public read)
      const publicRes = await fetch(
        `${PAYLOAD_URL}/api/form-submissions?limit=50&sort=-createdAt&depth=1`,
        { cache: "no-store" },
      );
      if (!publicRes.ok) {
        return {
          success: false,
          created: 0,
          skipped: 0,
          errors: 0,
          message: `Cannot access Payload CMS API (${publicRes.status}). Check PAYLOAD_CMS_API_KEY in .env`,
        };
      }
      data = await publicRes.json();
    } else {
      data = await res.json();
    }
  } catch (err) {
    return {
      success: false,
      created: 0,
      skipped: 0,
      errors: 0,
      message: `Failed to connect to website CMS: ${err}`,
    };
  }

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const submission of data.docs) {
    try {
      const formId =
        typeof submission.form === "object"
          ? submission.form.id
          : submission.form;
      const fields = submission.submissionData || [];

      // Extract fields based on form ID
      let firstName = "";
      let lastName = "";
      let email = "";
      let phone = "";
      let message = "";
      let sourceUrl = "";

      const getVal = (...names: string[]) => {
        for (const name of names) {
          const f = fields.find(
            (x) => x.field.toLowerCase() === name.toLowerCase(),
          );
          if (f?.value) return f.value;
        }
        return "";
      };

      switch (formId) {
        case 1: {
          const fullName = getVal("full-name", "fullname", "name");
          const parts = fullName.trim().split(/\s+/);
          firstName = parts[0] || "";
          lastName = parts.slice(1).join(" ");
          email = getVal("email");
          phone = getVal("phone");
          message = getVal("message");
          break;
        }
        case 2: {
          firstName = getVal("firstname", "first-name", "name");
          lastName = getVal("surname", "last-name", "lastname");
          email = getVal("email");
          phone = getVal("phone");
          message = getVal("message");
          sourceUrl = getVal("pageURL", "pageurl", "page-url");
          break;
        }
        case 3: {
          firstName = getVal("name", "firstname", "first-name");
          lastName = getVal("surname", "last-name", "lastname");
          email = getVal("email");
          phone = getVal("phone");
          break;
        }
        default: {
          firstName = getVal("firstname", "first-name", "name", "full-name");
          lastName = getVal("surname", "last-name", "lastname");
          email = getVal("email");
          phone = getVal("phone");
          message = getVal("message");
          sourceUrl = getVal("pageURL", "pageurl");
          if (!lastName && firstName.includes(" ")) {
            const parts = firstName.trim().split(/\s+/);
            firstName = parts[0];
            lastName = parts.slice(1).join(" ");
          }
          break;
        }
      }

      firstName = firstName.trim();
      lastName = lastName.trim();
      email = email.toLowerCase().trim();
      phone = phone.trim();

      if (!firstName || !email) {
        skipped++;
        continue;
      }

      // Check if already synced
      const existingByRef = await prisma.enquiry.findFirst({
        where: {
          sourceUrl: { contains: `submission:${submission.id}` },
        },
      });
      if (existingByRef) {
        skipped++;
        continue;
      }

      // Also check by email + timestamp window
      const submissionDate = new Date(submission.createdAt);
      const windowStart = new Date(submissionDate.getTime() - 60000);
      const windowEnd = new Date(submissionDate.getTime() + 60000);
      const existingByTime = await prisma.enquiry.findFirst({
        where: {
          email,
          source: "WEBSITE_FORM",
          createdAt: { gte: windowStart, lte: windowEnd },
        },
      });
      if (existingByTime) {
        skipped++;
        continue;
      }

      // Create enquiry
      const enquiry = await prisma.enquiry.create({
        data: {
          firstName,
          lastName: lastName || "-",
          email,
          phone: phone || "-",
          message: message.trim() || null,
          source: "WEBSITE_FORM",
          sourceUrl: sourceUrl
            ? `${sourceUrl} | submission:${submission.id}`
            : `submission:${submission.id}`,
          status: "NEW",
          segment: "Buyer",
          priority: "Medium",
        },
      });

      // Auto-assign
      try {
        const { autoAssignEnquiry } = await import("@/lib/lead-routing");
        await autoAssignEnquiry(enquiry.id);
      } catch {
        // Non-critical
      }

      created++;
    } catch {
      errors++;
    }
  }

  // Notify admins if new enquiries were created
  if (created > 0) {
    await notifySuperAdmins(
      "SYSTEM_ALERT",
      `Synced ${created} Website Enquiries`,
      `${created} new enquiries imported from the website by ${session.user.firstName}.`,
      "/clients/enquiries",
    );
  }

  revalidatePath("/clients/enquiries");

  return {
    success: true,
    created,
    skipped,
    errors,
    message:
      created > 0
        ? `Successfully synced ${created} new enquiries`
        : `No new enquiries found (${skipped} already synced)`,
  };
}
