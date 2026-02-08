"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { auth, type ExtendedSession } from "@/lib/auth";
import type { SaleStatus, Currency } from "@prisma/client";

export interface SaleFormData {
  bookingId?: string;
  clientId: string;
  propertyId: string;
  agentId: string;
  unitNumber?: string;
  salePrice: number;
  currency: Currency;
  paymentPlan?: string;
  depositAmount?: number;
  depositDate?: Date;
  completionDate?: Date;
  commissionAmount?: number;
  citizenshipEligible: boolean;
  notes?: string;
}

// Get all sales with filtering
export async function getSales(params?: {
  status?: SaleStatus;
  agentId?: string;
  page?: number;
  limit?: number;
}) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  const { status, agentId, page = 1, limit = 25 } = params || {};
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};

  if (session.user.role === "SALES_AGENT") {
    where.agentId = session.user.id;
  } else if (session.user.role !== "SUPER_ADMIN") {
    const officeAgents = await prisma.user.findMany({
      where: { office: session.user.office },
      select: { id: true },
    });
    where.agentId = { in: officeAgents.map((a) => a.id) };
  }

  if (status) where.status = status;
  if (agentId) where.agentId = agentId;

  const [sales, total] = await Promise.all([
    prisma.sale.findMany({
      where,
      include: {
        client: { select: { id: true, firstName: true, lastName: true } },
        property: {
          select: { id: true, name: true, pqtNumber: true, district: true },
        },
        agent: { select: { id: true, firstName: true, lastName: true } },
        booking: { select: { id: true, bookingDate: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.sale.count({ where }),
  ]);

  return { sales, total, pages: Math.ceil(total / limit), currentPage: page };
}

// Get single sale by ID
export async function getSaleById(id: string) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  const sale = await prisma.sale.findUnique({
    where: { id },
    include: {
      client: true,
      property: true,
      agent: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
      booking: true,
      citizenshipApplication: true,
    },
  });

  if (!sale) throw new Error("Sale not found");

  // Check access
  if (session.user.role === "SALES_AGENT" && sale.agentId !== session.user.id) {
    throw new Error("Unauthorized");
  }

  return sale;
}

// Get sales stats
export async function getSalesStats() {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  const thisYearStart = new Date(now.getFullYear(), 0, 1);

  const baseWhere: Record<string, unknown> = {};

  if (session.user.role === "SALES_AGENT") {
    baseWhere.agentId = session.user.id;
  } else if (session.user.role !== "SUPER_ADMIN") {
    const officeAgents = await prisma.user.findMany({
      where: { office: session.user.office },
      select: { id: true },
    });
    baseWhere.agentId = { in: officeAgents.map((a) => a.id) };
  }

  const [
    totalSales,
    thisMonthSales,
    lastMonthSales,
    thisYearSales,
    completedSales,
    pendingSales,
    totalRevenue,
    thisMonthRevenue,
    totalCommission,
    byStatus,
  ] = await Promise.all([
    prisma.sale.count({ where: baseWhere }),
    prisma.sale.count({
      where: { ...baseWhere, createdAt: { gte: thisMonthStart } },
    }),
    prisma.sale.count({
      where: {
        ...baseWhere,
        createdAt: { gte: lastMonthStart, lte: lastMonthEnd },
      },
    }),
    prisma.sale.count({
      where: { ...baseWhere, createdAt: { gte: thisYearStart } },
    }),
    prisma.sale.count({
      where: { ...baseWhere, status: "COMPLETED" },
    }),
    prisma.sale.count({
      where: {
        ...baseWhere,
        status: {
          in: ["PENDING_DEPOSIT", "DEPOSIT_RECEIVED", "CONTRACT_SIGNED"],
        },
      },
    }),
    prisma.sale.aggregate({
      where: baseWhere,
      _sum: { salePrice: true },
    }),
    prisma.sale.aggregate({
      where: { ...baseWhere, createdAt: { gte: thisMonthStart } },
      _sum: { salePrice: true },
    }),
    prisma.sale.aggregate({
      where: baseWhere,
      _sum: { commissionAmount: true },
    }),
    prisma.sale.groupBy({
      by: ["status"],
      where: baseWhere,
      _count: { id: true },
      _sum: { salePrice: true },
    }),
  ]);

  return {
    totalSales,
    thisMonthSales,
    lastMonthSales,
    thisYearSales,
    completedSales,
    pendingSales,
    totalRevenue: totalRevenue._sum.salePrice?.toNumber() || 0,
    thisMonthRevenue: thisMonthRevenue._sum.salePrice?.toNumber() || 0,
    totalCommission: totalCommission._sum.commissionAmount?.toNumber() || 0,
    byStatus,
  };
}

// Get agent performance for leaderboard
export async function getAgentLeaderboard(
  period: "month" | "quarter" | "year" = "month",
) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  const now = new Date();
  let startDate: Date;

  switch (period) {
    case "quarter":
      startDate = new Date(
        now.getFullYear(),
        Math.floor(now.getMonth() / 3) * 3,
        1,
      );
      break;
    case "year":
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  const baseWhere: Record<string, unknown> = {
    createdAt: { gte: startDate },
  };

  if (session.user.role !== "SUPER_ADMIN") {
    const officeAgents = await prisma.user.findMany({
      where: { office: session.user.office },
      select: { id: true },
    });
    baseWhere.agentId = { in: officeAgents.map((a) => a.id) };
  }

  const salesByAgent = await prisma.sale.groupBy({
    by: ["agentId"],
    where: baseWhere,
    _count: { id: true },
    _sum: { salePrice: true, commissionAmount: true },
  });

  const agentIds = salesByAgent.map((s) => s.agentId);
  const agents = await prisma.user.findMany({
    where: { id: { in: agentIds } },
    select: { id: true, firstName: true, lastName: true, office: true },
  });

  const leaderboard = salesByAgent
    .map((stat) => {
      const agent = agents.find((a) => a.id === stat.agentId);
      return {
        agentId: stat.agentId,
        agentName: agent ? `${agent.firstName} ${agent.lastName}` : "Unknown",
        office: agent?.office || "Unknown",
        salesCount: stat._count.id,
        totalRevenue: stat._sum.salePrice?.toNumber() || 0,
        totalCommission: stat._sum.commissionAmount?.toNumber() || 0,
      };
    })
    .sort((a, b) => b.totalRevenue - a.totalRevenue);

  return leaderboard;
}

// Create sale
export async function createSale(data: SaleFormData) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");
  if (session.user.role === "VIEWER") throw new Error("Unauthorized");

  const sale = await prisma.sale.create({
    data: {
      ...data,
      agentId: data.agentId || session.user.id,
    },
  });

  // Update booking outcome if linked
  if (data.bookingId) {
    await prisma.booking.update({
      where: { id: data.bookingId },
      data: { outcome: "SOLD", status: "COMPLETED" },
    });
  }

  // Update client status
  await prisma.client.update({
    where: { id: data.clientId },
    data: { status: "DEAL_CLOSED" },
  });

  revalidatePath("/sales");
  revalidatePath("/bookings");
  return sale;
}

// Update sale
export async function updateSale(
  id: string,
  data: Partial<SaleFormData & { status?: SaleStatus }>,
) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");
  if (session.user.role === "VIEWER") throw new Error("Unauthorized");

  const sale = await prisma.sale.update({
    where: { id },
    data,
  });

  revalidatePath("/sales");
  revalidatePath(`/sales/${id}`);
  return sale;
}

// Update sale status
export async function updateSaleStatus(id: string, status: SaleStatus) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");
  if (!["SUPER_ADMIN", "ADMIN", "SALES_MANAGER"].includes(session.user.role)) {
    throw new Error("Unauthorized - Manager approval required");
  }

  const sale = await prisma.sale.update({
    where: { id },
    data: { status },
  });

  revalidatePath("/sales");
  revalidatePath(`/sales/${id}`);
  return sale;
}

// Get form data for creating sales
export async function getSaleFormData() {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  const clientWhere: Record<string, unknown> = {};

  if (session.user.role === "SALES_AGENT") {
    clientWhere.assignedAgentId = session.user.id;
  } else if (session.user.role !== "SUPER_ADMIN") {
    const officeAgents = await prisma.user.findMany({
      where: { office: session.user.office },
      select: { id: true },
    });
    clientWhere.assignedAgentId = { in: officeAgents.map((a) => a.id) };
  }

  const [clients, properties, agents, bookingsWithOffers] = await Promise.all([
    prisma.client.findMany({
      where: clientWhere,
      select: { id: true, firstName: true, lastName: true },
      orderBy: { firstName: "asc" },
    }),
    prisma.property.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        name: true,
        pqtNumber: true,
        district: true,
        priceFrom: true,
      },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: {
        isActive: true,
        role: { in: ["SALES_AGENT", "SALES_MANAGER"] },
        ...(session.user.role !== "SUPER_ADMIN"
          ? { office: session.user.office }
          : {}),
      },
      select: { id: true, firstName: true, lastName: true },
      orderBy: { firstName: "asc" },
    }),
    prisma.booking.findMany({
      where: {
        outcome: "OFFER_MADE",
        sale: null, // No sale created yet
      },
      include: {
        client: { select: { id: true, firstName: true, lastName: true } },
        property: { select: { id: true, name: true, pqtNumber: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  return { clients, properties, agents, bookingsWithOffers };
}
