"use server";

import prisma from "@/lib/prisma";
import { auth, type ExtendedSession } from "@/lib/auth";

// Get daily KPIs
export async function getDailyKPIs(date?: Date) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  const targetDate = date || new Date();
  const startOfDay = new Date(
    targetDate.getFullYear(),
    targetDate.getMonth(),
    targetDate.getDate(),
  );
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

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
    callsMade,
    newLeads,
    bookingsScheduled,
    viewingsCompleted,
    salesClosed,
    salesRevenue,
  ] = await Promise.all([
    prisma.callLog.count({
      where: {
        ...baseWhere,
        callDate: { gte: startOfDay, lt: endOfDay },
      },
    }),
    prisma.client.count({
      where: {
        ...(baseWhere.agentId ? { assignedAgentId: baseWhere.agentId } : {}),
        createdAt: { gte: startOfDay, lt: endOfDay },
      },
    }),
    prisma.booking.count({
      where: {
        ...baseWhere,
        createdAt: { gte: startOfDay, lt: endOfDay },
      },
    }),
    prisma.booking.count({
      where: {
        ...baseWhere,
        status: "COMPLETED",
        bookingDate: { gte: startOfDay, lt: endOfDay },
      },
    }),
    prisma.sale.count({
      where: {
        ...baseWhere,
        createdAt: { gte: startOfDay, lt: endOfDay },
      },
    }),
    prisma.sale.aggregate({
      where: {
        ...baseWhere,
        createdAt: { gte: startOfDay, lt: endOfDay },
      },
      _sum: { salePrice: true },
    }),
  ]);

  // Daily targets (can be configured per office/agent)
  const targets = {
    calls: 30,
    leads: 5,
    bookings: 3,
    viewings: 2,
    sales: 1,
    revenue: 200000,
  };

  return {
    date: startOfDay,
    metrics: {
      callsMade: { value: callsMade, target: targets.calls },
      newLeads: { value: newLeads, target: targets.leads },
      bookingsScheduled: { value: bookingsScheduled, target: targets.bookings },
      viewingsCompleted: { value: viewingsCompleted, target: targets.viewings },
      salesClosed: { value: salesClosed, target: targets.sales },
      salesRevenue: {
        value: salesRevenue._sum.salePrice?.toNumber() || 0,
        target: targets.revenue,
      },
    },
  };
}

// Get monthly KPIs
export async function getMonthlyKPIs(year?: number, month?: number) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  const now = new Date();
  const targetYear = year ?? now.getFullYear();
  const targetMonth = month ?? now.getMonth();

  const startOfMonth = new Date(targetYear, targetMonth, 1);
  const endOfMonth = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59);

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

  // Get daily breakdown for chart
  const daysInMonth = endOfMonth.getDate();
  const dailyData: {
    day: number;
    sales: number;
    revenue: number;
    bookings: number;
  }[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const dayStart = new Date(targetYear, targetMonth, day);
    const dayEnd = new Date(targetYear, targetMonth, day, 23, 59, 59);

    const [daySales, dayBookings] = await Promise.all([
      prisma.sale.aggregate({
        where: {
          ...baseWhere,
          createdAt: { gte: dayStart, lte: dayEnd },
        },
        _count: { id: true },
        _sum: { salePrice: true },
      }),
      prisma.booking.count({
        where: {
          ...baseWhere,
          createdAt: { gte: dayStart, lte: dayEnd },
        },
      }),
    ]);

    dailyData.push({
      day,
      sales: daySales._count.id,
      revenue: daySales._sum.salePrice?.toNumber() || 0,
      bookings: dayBookings,
    });
  }

  const [
    totalCalls,
    totalLeads,
    totalBookings,
    completedViewings,
    totalSales,
    totalRevenue,
    totalCommission,
  ] = await Promise.all([
    prisma.callLog.count({
      where: {
        ...baseWhere,
        callDate: { gte: startOfMonth, lte: endOfMonth },
      },
    }),
    prisma.client.count({
      where: {
        ...(baseWhere.agentId ? { assignedAgentId: baseWhere.agentId } : {}),
        createdAt: { gte: startOfMonth, lte: endOfMonth },
      },
    }),
    prisma.booking.count({
      where: {
        ...baseWhere,
        createdAt: { gte: startOfMonth, lte: endOfMonth },
      },
    }),
    prisma.booking.count({
      where: {
        ...baseWhere,
        status: "COMPLETED",
        bookingDate: { gte: startOfMonth, lte: endOfMonth },
      },
    }),
    prisma.sale.count({
      where: {
        ...baseWhere,
        createdAt: { gte: startOfMonth, lte: endOfMonth },
      },
    }),
    prisma.sale.aggregate({
      where: {
        ...baseWhere,
        createdAt: { gte: startOfMonth, lte: endOfMonth },
      },
      _sum: { salePrice: true },
    }),
    prisma.sale.aggregate({
      where: {
        ...baseWhere,
        createdAt: { gte: startOfMonth, lte: endOfMonth },
      },
      _sum: { commissionAmount: true },
    }),
  ]);

  // Monthly targets
  const targets = {
    calls: 600,
    leads: 100,
    bookings: 60,
    viewings: 40,
    sales: 20,
    revenue: 4000000,
    commission: 120000,
  };

  return {
    year: targetYear,
    month: targetMonth,
    monthName: startOfMonth.toLocaleString("en-US", { month: "long" }),
    dailyData,
    metrics: {
      totalCalls: { value: totalCalls, target: targets.calls },
      totalLeads: { value: totalLeads, target: targets.leads },
      totalBookings: { value: totalBookings, target: targets.bookings },
      completedViewings: { value: completedViewings, target: targets.viewings },
      totalSales: { value: totalSales, target: targets.sales },
      totalRevenue: {
        value: totalRevenue._sum.salePrice?.toNumber() || 0,
        target: targets.revenue,
      },
      totalCommission: {
        value: totalCommission._sum.commissionAmount?.toNumber() || 0,
        target: targets.commission,
      },
    },
  };
}

// Get yearly KPIs
export async function getYearlyKPIs(year?: number) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  const targetYear = year ?? new Date().getFullYear();
  const startOfYear = new Date(targetYear, 0, 1);
  const endOfYear = new Date(targetYear, 11, 31, 23, 59, 59);

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

  // Get monthly breakdown
  const monthlyData: { month: string; sales: number; revenue: number }[] = [];
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

  for (let month = 0; month < 12; month++) {
    const monthStart = new Date(targetYear, month, 1);
    const monthEnd = new Date(targetYear, month + 1, 0, 23, 59, 59);

    const monthSales = await prisma.sale.aggregate({
      where: {
        ...baseWhere,
        createdAt: { gte: monthStart, lte: monthEnd },
      },
      _count: { id: true },
      _sum: { salePrice: true },
    });

    monthlyData.push({
      month: monthNames[month],
      sales: monthSales._count.id,
      revenue: monthSales._sum.salePrice?.toNumber() || 0,
    });
  }

  const [
    totalLeads,
    totalBookings,
    completedViewings,
    totalSales,
    totalRevenue,
    totalCommission,
    citizenshipSales,
  ] = await Promise.all([
    prisma.client.count({
      where: {
        ...(baseWhere.agentId ? { assignedAgentId: baseWhere.agentId } : {}),
        createdAt: { gte: startOfYear, lte: endOfYear },
      },
    }),
    prisma.booking.count({
      where: {
        ...baseWhere,
        createdAt: { gte: startOfYear, lte: endOfYear },
      },
    }),
    prisma.booking.count({
      where: {
        ...baseWhere,
        status: "COMPLETED",
        bookingDate: { gte: startOfYear, lte: endOfYear },
      },
    }),
    prisma.sale.count({
      where: {
        ...baseWhere,
        createdAt: { gte: startOfYear, lte: endOfYear },
      },
    }),
    prisma.sale.aggregate({
      where: {
        ...baseWhere,
        createdAt: { gte: startOfYear, lte: endOfYear },
      },
      _sum: { salePrice: true },
    }),
    prisma.sale.aggregate({
      where: {
        ...baseWhere,
        createdAt: { gte: startOfYear, lte: endOfYear },
      },
      _sum: { commissionAmount: true },
    }),
    prisma.sale.count({
      where: {
        ...baseWhere,
        citizenshipEligible: true,
        createdAt: { gte: startOfYear, lte: endOfYear },
      },
    }),
  ]);

  // Yearly targets
  const targets = {
    leads: 1200,
    bookings: 720,
    viewings: 480,
    sales: 240,
    revenue: 48000000,
    commission: 1440000,
  };

  // Calculate conversion rates
  const leadToViewingRate =
    totalLeads > 0 ? (completedViewings / totalLeads) * 100 : 0;
  const viewingToSaleRate =
    completedViewings > 0 ? (totalSales / completedViewings) * 100 : 0;
  const averageDealSize =
    totalSales > 0
      ? (totalRevenue._sum.salePrice?.toNumber() || 0) / totalSales
      : 0;

  return {
    year: targetYear,
    monthlyData,
    metrics: {
      totalLeads: { value: totalLeads, target: targets.leads },
      totalBookings: { value: totalBookings, target: targets.bookings },
      completedViewings: { value: completedViewings, target: targets.viewings },
      totalSales: { value: totalSales, target: targets.sales },
      totalRevenue: {
        value: totalRevenue._sum.salePrice?.toNumber() || 0,
        target: targets.revenue,
      },
      totalCommission: {
        value: totalCommission._sum.commissionAmount?.toNumber() || 0,
        target: targets.commission,
      },
    },
    insights: {
      leadToViewingRate,
      viewingToSaleRate,
      averageDealSize,
      citizenshipSales,
    },
  };
}

// Get agent performance comparison
export async function getAgentPerformance(
  period: "month" | "quarter" | "year" = "month",
) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  if (!["SUPER_ADMIN", "ADMIN", "SALES_MANAGER"].includes(session.user.role)) {
    throw new Error("Unauthorized");
  }

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

  const agentWhere: Record<string, unknown> = {
    isActive: true,
    role: { in: ["SALES_AGENT", "SALES_MANAGER"] },
  };

  if (session.user.role !== "SUPER_ADMIN") {
    agentWhere.office = session.user.office;
  }

  const agents = await prisma.user.findMany({
    where: agentWhere,
    select: { id: true, firstName: true, lastName: true, office: true },
  });

  const agentStats = await Promise.all(
    agents.map(async (agent) => {
      const [sales, bookings, calls] = await Promise.all([
        prisma.sale.aggregate({
          where: {
            agentId: agent.id,
            createdAt: { gte: startDate },
          },
          _count: { id: true },
          _sum: { salePrice: true, commissionAmount: true },
        }),
        prisma.booking.count({
          where: {
            agentId: agent.id,
            createdAt: { gte: startDate },
          },
        }),
        prisma.callLog.count({
          where: {
            agentId: agent.id,
            callDate: { gte: startDate },
          },
        }),
      ]);

      return {
        agentId: agent.id,
        agentName: `${agent.firstName} ${agent.lastName}`,
        office: agent.office,
        salesCount: sales._count.id,
        revenue: sales._sum.salePrice?.toNumber() || 0,
        commission: sales._sum.commissionAmount?.toNumber() || 0,
        bookings,
        calls,
      };
    }),
  );

  return agentStats.sort((a, b) => b.revenue - a.revenue);
}
