"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { auth, type ExtendedSession } from "@/lib/auth";
import type { ClientStatus, LeadSource, PropertyType, InvestmentPurpose, District } from "@prisma/client";

export interface ClientFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  whatsapp?: string;
  nationality: string;
  country: string;
  city?: string;
  budgetMin: number;
  budgetMax: number;
  preferredDistricts: District[];
  preferredPropertyType?: PropertyType;
  investmentPurpose: InvestmentPurpose;
  source: LeadSource;
  status: ClientStatus;
  notes?: string;
  assignedAgentId?: string;
}

export async function getClients(params?: {
  search?: string;
  status?: ClientStatus;
  agentId?: string;
  source?: LeadSource;
  page?: number;
  limit?: number;
}) {
  const session = await auth() as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  const { search, status, agentId, source, page = 1, limit = 25 } = params || {};
  const skip = (page - 1) * limit;

  // Build where clause based on user role
  const where: Record<string, unknown> = {};

  // Role-based filtering
  if (session.user.role === "SALES_AGENT") {
    where.assignedAgentId = session.user.id;
  } else if (session.user.role !== "SUPER_ADMIN") {
    // Admins and managers see clients assigned to agents in their office
    const officeAgents = await prisma.user.findMany({
      where: { office: session.user.office },
      select: { id: true },
    });
    where.assignedAgentId = { in: officeAgents.map((a) => a.id) };
  }

  // Apply filters
  if (status) where.status = status;
  if (agentId) where.assignedAgentId = agentId;
  if (source) where.source = source;
  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { phone: { contains: search, mode: "insensitive" } },
    ];
  }

  const [clients, total] = await Promise.all([
    prisma.client.findMany({
      where,
      include: {
        assignedAgent: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.client.count({ where }),
  ]);

  return {
    clients,
    total,
    pages: Math.ceil(total / limit),
    currentPage: page,
  };
}

export async function getClient(id: string) {
  const session = await auth() as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      assignedAgent: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
      bookings: {
        include: {
          property: { select: { id: true, name: true, pqtNumber: true } },
        },
        orderBy: { bookingDate: "desc" },
        take: 10,
      },
      communications: {
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          agent: { select: { firstName: true, lastName: true } },
        },
      },
      sales: {
        include: {
          property: { select: { id: true, name: true, pqtNumber: true } },
        },
      },
      citizenshipApplications: {
        include: {
          sale: {
            include: {
              property: { select: { name: true } },
            },
          },
        },
      },
      documents: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!client) return null;

  // Check access for non-super-admin users
  if (session.user.role === "SALES_AGENT" && client.assignedAgentId !== session.user.id) {
    throw new Error("Unauthorized");
  }

  return client;
}

export async function createClient(data: ClientFormData) {
  const session = await auth() as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");
  if (session.user.role === "VIEWER") throw new Error("Unauthorized");

  const client = await prisma.client.create({
    data: {
      ...data,
      budgetMin: data.budgetMin,
      budgetMax: data.budgetMax,
      assignedAgentId: data.assignedAgentId || session.user.id,
    },
  });

  revalidatePath("/clients");
  return client;
}

export async function updateClient(id: string, data: Partial<ClientFormData>) {
  const session = await auth() as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");
  if (session.user.role === "VIEWER") throw new Error("Unauthorized");

  // Check if user can edit this client
  const existingClient = await prisma.client.findUnique({
    where: { id },
    select: { assignedAgentId: true },
  });

  if (!existingClient) throw new Error("Client not found");

  if (
    session.user.role === "SALES_AGENT" &&
    existingClient.assignedAgentId !== session.user.id
  ) {
    throw new Error("Unauthorized");
  }

  const client = await prisma.client.update({
    where: { id },
    data,
  });

  revalidatePath(`/clients/${id}`);
  revalidatePath("/clients");
  return client;
}

export async function deleteClient(id: string) {
  const session = await auth() as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");
  if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  await prisma.client.delete({ where: { id } });
  revalidatePath("/clients");
}

export async function getAgentsForAssignment() {
  const session = await auth() as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  const where: Record<string, unknown> = {
    isActive: true,
    role: { in: ["SALES_AGENT", "SALES_MANAGER"] },
  };

  // Filter by office for non-super-admins
  if (session.user.role !== "SUPER_ADMIN") {
    where.office = session.user.office;
  }

  return prisma.user.findMany({
    where,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      office: true,
    },
    orderBy: { firstName: "asc" },
  });
}
