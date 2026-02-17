"use server";

import prisma from "@/lib/prisma";
import { auth, type ExtendedSession } from "@/lib/auth";

/**
 * Returns client queue data per agent for a grouped bar chart
 */
export async function getAgentQueueStats() {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  // Build agent filter
  let agentFilter: string[] | undefined;

  if (session.user.role === "SALES_AGENT") {
    agentFilter = [session.user.id];
  } else if (session.user.role !== "SUPER_ADMIN") {
    const officeAgents = await prisma.user.findMany({
      where: { office: session.user.office as any },
      select: { id: true },
    });
    agentFilter = officeAgents.map((a) => a.id);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayEnd = new Date(today);
  todayEnd.setHours(23, 59, 59, 999);

  // Get all enquiries with filters
  const enquiries = await prisma.enquiry.findMany({
    where: agentFilter
      ? {
          OR: [
            { assignedAgentId: { in: agentFilter } },
            { assignedAgentId: null },
          ],
        }
      : undefined,
    select: {
      assignedAgentId: true,
      nextCallDate: true,
      status: true,
      assignedAgent: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  // Group by agent
  const agentMap = new Map<
    string,
    {
      agentName: string;
      todayCalls: number;
      previousCalls: number;
      futureCalls: number;
      newLeads: number;
    }
  >();

  for (const enquiry of enquiries) {
    const agentId = enquiry.assignedAgentId || "unassigned";
    const agentName = enquiry.assignedAgent
      ? `${enquiry.assignedAgent.firstName} ${enquiry.assignedAgent.lastName}`
      : "Unassigned";

    if (!agentMap.has(agentId)) {
      agentMap.set(agentId, {
        agentName,
        todayCalls: 0,
        previousCalls: 0,
        futureCalls: 0,
        newLeads: 0,
      });
    }

    const stats = agentMap.get(agentId)!;

    // Count based on nextCallDate
    if (enquiry.nextCallDate) {
      const callDate = new Date(enquiry.nextCallDate);
      if (callDate >= today && callDate <= todayEnd) {
        stats.todayCalls++;
      } else if (callDate < today) {
        stats.previousCalls++;
      } else if (callDate > todayEnd) {
        stats.futureCalls++;
      }
    }

    // Count new leads
    if (enquiry.status === "NEW") {
      stats.newLeads++;
    }
  }

  return Array.from(agentMap.values());
}

/**
 * Returns client percentage distribution per agent for a donut chart
 */
export async function getAgentClientDistribution() {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  // Build agent filter
  let agentFilter: string[] | undefined;

  if (session.user.role === "SALES_AGENT") {
    agentFilter = [session.user.id];
  } else if (session.user.role !== "SUPER_ADMIN") {
    const officeAgents = await prisma.user.findMany({
      where: { office: session.user.office as any },
      select: { id: true },
    });
    agentFilter = officeAgents.map((a) => a.id);
  }

  // Group enquiries by agent
  const grouped = await prisma.enquiry.groupBy({
    by: ["assignedAgentId"],
    _count: true,
    where: agentFilter
      ? {
          OR: [
            { assignedAgentId: { in: agentFilter } },
            { assignedAgentId: null },
          ],
        }
      : undefined,
  });

  const total = grouped.reduce((sum, g) => sum + g._count, 0);

  // Get agent names
  const agentIds = grouped
    .map((g) => g.assignedAgentId)
    .filter((id): id is string => id !== null);

  const agents = await prisma.user.findMany({
    where: { id: { in: agentIds } },
    select: { id: true, firstName: true, lastName: true },
  });

  const agentNameMap = new Map(
    agents.map((a) => [a.id, `${a.firstName} ${a.lastName}`]),
  );

  return grouped.map((g) => ({
    agentName: g.assignedAgentId
      ? agentNameMap.get(g.assignedAgentId) || "Unknown"
      : "Unassigned",
    count: g._count,
    percentage: total > 0 ? Math.round((g._count / total) * 100) : 0,
  }));
}

/**
 * Returns daily activity counts per agent over a date range for a line chart
 */
export async function getAgentActivityTimeline(from?: string, to?: string) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  // Build agent filter
  let agentFilter: string[] | undefined;

  if (session.user.role === "SALES_AGENT") {
    agentFilter = [session.user.id];
  } else if (session.user.role !== "SUPER_ADMIN") {
    const officeAgents = await prisma.user.findMany({
      where: { office: session.user.office as any },
      select: { id: true },
    });
    agentFilter = officeAgents.map((a) => a.id);
  }

  // Default range: last 30 days
  const endDate = to ? new Date(to) : new Date();
  const startDate = from
    ? new Date(from)
    : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Query activities
  const activities = await prisma.activity.findMany({
    where: {
      createdAt: { gte: startDate, lte: endDate },
      ...(agentFilter ? { userId: { in: agentFilter } } : {}),
    },
    select: {
      userId: true,
      createdAt: true,
      user: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  // Query communications
  const communications = await prisma.communication.findMany({
    where: {
      createdAt: { gte: startDate, lte: endDate },
      ...(agentFilter ? { agentId: { in: agentFilter } } : {}),
    },
    select: {
      agentId: true,
      createdAt: true,
      agent: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  // Build date map
  const dateMap = new Map<string, Record<string, number>>();

  // Process activities
  for (const activity of activities) {
    const dateStr = activity.createdAt.toISOString().split("T")[0];
    const agentName = `${activity.user.firstName} ${activity.user.lastName}`;

    if (!dateMap.has(dateStr)) {
      dateMap.set(dateStr, { date: dateStr } as any);
    }

    const record = dateMap.get(dateStr)!;
    record[agentName] = (record[agentName] || 0) + 1;
  }

  // Process communications
  for (const comm of communications) {
    const dateStr = comm.createdAt.toISOString().split("T")[0];
    const agentName = comm.agent
      ? `${comm.agent.firstName} ${comm.agent.lastName}`
      : "Unknown";

    if (!dateMap.has(dateStr)) {
      dateMap.set(dateStr, { date: dateStr } as any);
    }

    const record = dateMap.get(dateStr)!;
    record[agentName] = (record[agentName] || 0) + 1;
  }

  // Convert to array and sort by date
  return Array.from(dateMap.values()).sort((a, b) =>
    String(a.date).localeCompare(String(b.date)),
  );
}

/**
 * Returns notes count per agent for a horizontal bar chart
 */
export async function getAgentNoteStats(
  period: "week" | "month" | "quarter" = "month",
) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  // Build agent filter
  let agentFilter: string[] | undefined;

  if (session.user.role === "SALES_AGENT") {
    agentFilter = [session.user.id];
  } else if (session.user.role !== "SUPER_ADMIN") {
    const officeAgents = await prisma.user.findMany({
      where: { office: session.user.office as any },
      select: { id: true },
    });
    agentFilter = officeAgents.map((a) => a.id);
  }

  // Calculate date range
  const endDate = new Date();
  const startDate = new Date();
  switch (period) {
    case "week":
      startDate.setDate(endDate.getDate() - 7);
      break;
    case "month":
      startDate.setMonth(endDate.getMonth() - 1);
      break;
    case "quarter":
      startDate.setMonth(endDate.getMonth() - 3);
      break;
  }

  // Query activity notes
  const activityNotes = await prisma.activity.groupBy({
    by: ["userId"],
    _count: true,
    where: {
      type: "NOTE",
      createdAt: { gte: startDate, lte: endDate },
      ...(agentFilter ? { userId: { in: agentFilter } } : {}),
    },
  });

  // Query enquiry notes
  const enquiryNotes = await prisma.enquiryNote.groupBy({
    by: ["agentId"],
    _count: true,
    where: {
      createdAt: { gte: startDate, lte: endDate },
      ...(agentFilter ? { agentId: { in: agentFilter } } : {}),
    },
  });

  // Query lead notes
  const leadNotes = await prisma.leadNote.groupBy({
    by: ["agentId"],
    _count: true,
    where: {
      createdAt: { gte: startDate, lte: endDate },
      ...(agentFilter ? { agentId: { in: agentFilter } } : {}),
    },
  });

  // Combine all agent IDs
  const allAgentIds = new Set<string>();
  activityNotes.forEach((n) => allAgentIds.add(n.userId));
  enquiryNotes.forEach((n) => allAgentIds.add(n.agentId));
  leadNotes.forEach((n) => allAgentIds.add(n.agentId));

  // Get agent names
  const agents = await prisma.user.findMany({
    where: { id: { in: Array.from(allAgentIds) } },
    select: { id: true, firstName: true, lastName: true },
  });

  const agentNameMap = new Map(
    agents.map((a) => [a.id, `${a.firstName} ${a.lastName}`]),
  );

  // Build result
  const result = Array.from(allAgentIds).map((agentId) => {
    const activityCount =
      activityNotes.find((n) => n.userId === agentId)?._count || 0;
    const enquiryCount =
      enquiryNotes.find((n) => n.agentId === agentId)?._count || 0;
    const leadCount = leadNotes.find((n) => n.agentId === agentId)?._count || 0;

    return {
      agentName: agentNameMap.get(agentId) || "Unknown",
      notesCount: activityCount + enquiryCount + leadCount,
      enquiryNotes: enquiryCount,
      leadNotes: leadCount,
      activityNotes: activityCount,
    };
  });

  return result.sort((a, b) => b.notesCount - a.notesCount);
}

/**
 * Returns sales/revenue/booking/call metrics per agent for a table
 */
export async function getAgentSalesPerformance(
  period: "week" | "month" | "quarter" | "year" = "month",
) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  // Build agent filter
  let agentFilter: string[] | undefined;

  if (session.user.role === "SALES_AGENT") {
    agentFilter = [session.user.id];
  } else if (session.user.role !== "SUPER_ADMIN") {
    const officeAgents = await prisma.user.findMany({
      where: { office: session.user.office as any },
      select: { id: true },
    });
    agentFilter = officeAgents.map((a) => a.id);
  }

  // Calculate date range
  const endDate = new Date();
  const startDate = new Date();
  switch (period) {
    case "week":
      startDate.setDate(endDate.getDate() - 7);
      break;
    case "month":
      startDate.setMonth(endDate.getMonth() - 1);
      break;
    case "quarter":
      startDate.setMonth(endDate.getMonth() - 3);
      break;
    case "year":
      startDate.setFullYear(endDate.getFullYear() - 1);
      break;
  }

  // Get all agents in scope
  const agents = await prisma.user.findMany({
    where: agentFilter ? { id: { in: agentFilter } } : undefined,
    select: { id: true, firstName: true, lastName: true },
  });

  const result = await Promise.all(
    agents.map(async (agent) => {
      // Count sales
      const sales = await prisma.sale.findMany({
        where: {
          agentId: agent.id,
          createdAt: { gte: startDate, lte: endDate },
        },
        select: { salePrice: true },
      });

      const totalSales = sales.length;
      const totalRevenue = sales.reduce(
        (sum, s) => sum + Number(s.salePrice || 0),
        0,
      );

      // Count bookings
      const totalBookings = await prisma.booking.count({
        where: {
          agentId: agent.id,
          createdAt: { gte: startDate, lte: endDate },
        },
      });

      // Count calls
      const totalCalls = await prisma.callLog.count({
        where: {
          agentId: agent.id,
          callDate: { gte: startDate, lte: endDate },
        },
      });

      // Count leads (using ownerId)
      const totalLeads = await prisma.lead.count({
        where: {
          ownerId: agent.id,
          createdAt: { gte: startDate, lte: endDate },
        },
      });

      // Count deals (using ownerId)
      const [totalDeals, wonDeals] = await Promise.all([
        prisma.deal.count({
          where: {
            ownerId: agent.id,
            createdAt: { gte: startDate, lte: endDate },
          },
        }),
        prisma.deal.count({
          where: {
            ownerId: agent.id,
            result: "WON",
            createdAt: { gte: startDate, lte: endDate },
          },
        }),
      ]);

      const conversionRate =
        totalDeals > 0 ? Math.round((wonDeals / totalDeals) * 100) : 0;

      return {
        agentName: `${agent.firstName} ${agent.lastName}`,
        agentId: agent.id,
        totalSales,
        totalRevenue,
        totalBookings,
        totalCalls,
        totalLeads,
        totalDeals,
        wonDeals,
        conversionRate,
      };
    }),
  );

  return result.sort((a, b) => b.totalRevenue - a.totalRevenue);
}

/**
 * Returns today's granular stats per agent for a daily activity table
 */
export async function getAgentDailyBreakdown(date?: string) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  // Build agent filter
  let agentFilter: string[] | undefined;

  if (session.user.role === "SALES_AGENT") {
    agentFilter = [session.user.id];
  } else if (session.user.role !== "SUPER_ADMIN") {
    const officeAgents = await prisma.user.findMany({
      where: { office: session.user.office as any },
      select: { id: true },
    });
    agentFilter = officeAgents.map((a) => a.id);
  }

  // Parse date
  const targetDate = date ? new Date(date) : new Date();
  targetDate.setHours(0, 0, 0, 0);
  const targetDateEnd = new Date(targetDate);
  targetDateEnd.setHours(23, 59, 59, 999);

  // Get all agents in scope
  const agents = await prisma.user.findMany({
    where: agentFilter ? { id: { in: agentFilter } } : undefined,
    select: { id: true, firstName: true, lastName: true },
  });

  const result = await Promise.all(
    agents.map(async (agent) => {
      // Count calls
      const calls = await prisma.callLog.count({
        where: {
          agentId: agent.id,
          callDate: { gte: targetDate, lte: targetDateEnd },
        },
      });

      // Count emails and meetings
      const communications = await prisma.communication.groupBy({
        by: ["type"],
        _count: true,
        where: {
          agentId: agent.id,
          createdAt: { gte: targetDate, lte: targetDateEnd },
          type: { in: ["EMAIL", "IN_PERSON"] },
        },
      });

      const emails =
        communications.find((c) => c.type === "EMAIL")?._count || 0;
      const meetings =
        communications.find((c) => c.type === "IN_PERSON")?._count || 0;

      // Count notes
      const [enquiryNotes, leadNotes, activityNotes] = await Promise.all([
        prisma.enquiryNote.count({
          where: {
            agentId: agent.id,
            createdAt: { gte: targetDate, lte: targetDateEnd },
          },
        }),
        prisma.leadNote.count({
          where: {
            agentId: agent.id,
            createdAt: { gte: targetDate, lte: targetDateEnd },
          },
        }),
        prisma.activity.count({
          where: {
            userId: agent.id,
            type: "NOTE",
            createdAt: { gte: targetDate, lte: targetDateEnd },
          },
        }),
      ]);

      const notes = enquiryNotes + leadNotes + activityNotes;

      // Count new enquiries
      const newEnquiries = await prisma.enquiry.count({
        where: {
          assignedAgentId: agent.id,
          createdAt: { gte: targetDate, lte: targetDateEnd },
        },
      });

      // Count new leads (using ownerId)
      const newLeads = await prisma.lead.count({
        where: {
          ownerId: agent.id,
          createdAt: { gte: targetDate, lte: targetDateEnd },
        },
      });

      return {
        agentName: `${agent.firstName} ${agent.lastName}`,
        agentId: agent.id,
        calls,
        emails,
        meetings,
        notes,
        newEnquiries,
        newLeads,
      };
    }),
  );

  return result.sort((a, b) => {
    const aTotal = a.calls + a.emails + a.meetings + a.notes;
    const bTotal = b.calls + b.emails + b.meetings + b.notes;
    return bTotal - aTotal;
  });
}
