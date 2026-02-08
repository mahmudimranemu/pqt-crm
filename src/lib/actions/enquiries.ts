"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { auth, type ExtendedSession } from "@/lib/auth";
import type { EnquiryStatus, EnquirySource } from "@prisma/client";

export async function getEnquiries(params?: {
  status?: EnquiryStatus;
  source?: EnquirySource;
  agentId?: string;
  page?: number;
  limit?: number;
}) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  const { status, source, agentId, page = 1, limit = 25 } = params || {};
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};

  // Role-based filtering
  if (session.user.role === "SALES_AGENT") {
    where.OR = [
      { assignedAgentId: session.user.id },
      { assignedAgentId: null },
    ];
  } else if (session.user.role !== "SUPER_ADMIN") {
    const officeAgents = await prisma.user.findMany({
      where: { office: session.user.office },
      select: { id: true },
    });
    where.OR = [
      { assignedAgentId: { in: officeAgents.map((a) => a.id) } },
      { assignedAgentId: null },
    ];
  }

  if (status) where.status = status;
  if (source) where.source = source;
  if (agentId) where.assignedAgentId = agentId;

  const [enquiries, total, newCount] = await Promise.all([
    prisma.enquiry.findMany({
      where,
      include: {
        assignedAgent: {
          select: { id: true, firstName: true, lastName: true },
        },
        convertedClient: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.enquiry.count({ where }),
    prisma.enquiry.count({ where: { ...where, status: "NEW" } }),
  ]);

  return {
    enquiries,
    total,
    newCount,
    pages: Math.ceil(total / limit),
    currentPage: page,
  };
}

export async function getEnquiry(id: string) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  return prisma.enquiry.findUnique({
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
    },
  });
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
      assignedAgentId: data.assignedAgentId || null,
      interestedPropertyId: data.interestedPropertyId || null,
      status: data.assignedAgentId ? "ASSIGNED" : "NEW",
    },
  });

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
    budget?: string;
    country?: string;
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

  const data = rows.map((row) => ({
    firstName: row.firstName.trim(),
    lastName: row.lastName.trim(),
    email: row.email.trim(),
    phone: row.phone.trim(),
    message: row.message?.trim() || null,
    source: (validSources.includes(row.source || "")
      ? row.source
      : "WEBSITE_FORM") as EnquirySource,
    budget: row.budget?.trim() || null,
    country: row.country?.trim() || null,
    status: "NEW" as const,
  }));

  const result = await prisma.enquiry.createMany({ data });

  revalidatePath("/clients/enquiries");
  return { count: result.count };
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

  const enquiry = await prisma.enquiry.update({
    where: { id: enquiryId },
    data: { status },
  });

  revalidatePath("/clients/enquiries");
  return enquiry;
}

export async function convertToClient(
  enquiryId: string,
  additionalData?: {
    budgetMin?: number;
    budgetMax?: number;
    nationality?: string;
    country?: string;
  },
) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");
  if (session.user.role === "VIEWER") throw new Error("Unauthorized");

  const enquiry = await prisma.enquiry.findUnique({
    where: { id: enquiryId },
  });

  if (!enquiry) throw new Error("Enquiry not found");
  if (enquiry.convertedClientId) throw new Error("Already converted to client");

  // Create the client
  const client = await prisma.client.create({
    data: {
      firstName: enquiry.firstName,
      lastName: enquiry.lastName,
      email: enquiry.email,
      phone: enquiry.phone,
      nationality: additionalData?.nationality || "Not specified",
      country: additionalData?.country || "Not specified",
      budgetMin: additionalData?.budgetMin || 200000,
      budgetMax: additionalData?.budgetMax || 500000,
      source:
        enquiry.source === "WEBSITE_FORM"
          ? "WEBSITE"
          : enquiry.source === "PHONE_CALL"
            ? "OTHER"
            : enquiry.source === "EMAIL"
              ? "OTHER"
              : enquiry.source === "WHATSAPP"
                ? "OTHER"
                : enquiry.source === "LIVE_CHAT"
                  ? "OTHER"
                  : "PARTNER",
      status: "NEW_LEAD",
      investmentPurpose: "RESIDENTIAL",
      assignedAgentId: enquiry.assignedAgentId || session.user.id,
      notes: enquiry.message || undefined,
    },
  });

  // Update the enquiry
  await prisma.enquiry.update({
    where: { id: enquiryId },
    data: {
      status: "CONVERTED_TO_CLIENT",
      convertedClientId: client.id,
    },
  });

  revalidatePath("/clients/enquiries");
  revalidatePath("/clients");
  return client;
}

export async function updateEnquiryField(
  enquiryId: string,
  field: string,
  value: string | boolean | Date | null,
) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");
  if (session.user.role === "VIEWER") throw new Error("Unauthorized");

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

  revalidatePath("/clients/enquiries");
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

  await prisma.enquiry.delete({ where: { id } });
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
