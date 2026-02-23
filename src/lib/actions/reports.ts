"use server";

import prisma from "@/lib/prisma";
import { auth, type ExtendedSession } from "@/lib/auth";

// Pipeline Report: Deal value by stage
export async function getPipelineReport() {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  const viewAll = ["SUPER_ADMIN", "ADMIN", "SALES_MANAGER"].includes(
    session.user.role,
  );
  const ownerFilter: any = viewAll ? {} : { ownerId: session.user.id };

  const [byStage, totals, recentDeals] = await Promise.all([
    prisma.deal.groupBy({
      by: ["stage"],
      where: { ...ownerFilter, result: "PENDING" },
      _count: true,
      _sum: { dealValue: true },
      _avg: { dealValue: true },
    }),
    prisma.deal.aggregate({
      where: { ...ownerFilter, result: "PENDING" },
      _count: true,
      _sum: { dealValue: true },
      _avg: { dealValue: true },
    }),
    prisma.deal.findMany({
      where: { ...ownerFilter, result: "PENDING" },
      select: {
        id: true,
        title: true,
        dealNumber: true,
        stage: true,
        dealValue: true,
        currency: true,
        expectedCloseDate: true,
        owner: { select: { firstName: true, lastName: true } },
        client: { select: { firstName: true, lastName: true } },
      },
      orderBy: { dealValue: "desc" },
      take: 10,
    }),
  ]);

  const stageOrder = [
    "RESERVATION",
    "DEPOSIT",
    "CONTRACT",
    "PAYMENT_PLAN",
    "TITLE_DEED",
    "COMPLETED",
  ];

  const stages = stageOrder.map((stage) => {
    const data = byStage.find((s) => s.stage === stage);
    return {
      stage,
      label: stage.replace(/_/g, " "),
      count: data?._count || 0,
      value: Number(data?._sum.dealValue || 0),
      avgValue: Number(data?._avg.dealValue || 0),
    };
  });

  return {
    stages,
    totalDeals: totals._count || 0,
    totalValue: Number(totals._sum.dealValue || 0),
    avgDealValue: Number(totals._avg.dealValue || 0),
    topDeals: recentDeals.map((d) => ({
      ...d,
      dealValue: Number(d.dealValue),
    })),
  };
}

// Conversion Funnel: Lead stage counts and conversion rates
export async function getConversionFunnel() {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  const viewAll = ["SUPER_ADMIN", "ADMIN", "SALES_MANAGER"].includes(
    session.user.role,
  );
  const ownerFilter: any = viewAll ? {} : { ownerId: session.user.id };

  const [leadsByStage, totalLeads, totalDeals, wonDeals, lostLeads] =
    await Promise.all([
      prisma.lead.groupBy({
        by: ["stage"],
        where: ownerFilter,
        _count: true,
      }),
      prisma.lead.count({ where: ownerFilter }),
      prisma.deal.count({ where: ownerFilter }),
      prisma.deal.count({ where: { ...ownerFilter, result: "WON" } }),
      prisma.lead.count({ where: { ...ownerFilter, stage: "LOST" } }),
    ]);

  const stageOrder = [
    "NEW_ENQUIRY",
    "CONTACTED",
    "QUALIFIED",
    "VIEWING_ARRANGED",
    "VIEWED",
    "OFFER_MADE",
    "NEGOTIATING",
    "WON",
    "LOST",
  ];

  const funnel = stageOrder.map((stage) => {
    const data = leadsByStage.find((s) => s.stage === stage);
    const count = data?._count || 0;
    return {
      stage,
      label: stage.replace(/_/g, " "),
      count,
      percentage: totalLeads > 0 ? Math.round((count / totalLeads) * 100) : 0,
    };
  });

  return {
    funnel,
    totalLeads,
    totalDeals,
    wonDeals,
    lostLeads,
    conversionRate:
      totalLeads > 0 ? Math.round((wonDeals / totalLeads) * 100) : 0,
    leadToDealRate:
      totalLeads > 0 ? Math.round((totalDeals / totalLeads) * 100) : 0,
  };
}

// Revenue Report: Monthly revenue from deals
export async function getRevenueReport() {
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

  const monthlyData: {
    month: string;
    deals: number;
    revenue: number;
  }[] = [];

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

    const result = await prisma.deal.aggregate({
      where: {
        ...ownerFilter,
        result: "WON",
        actualCloseDate: { gte: monthStart, lte: monthEnd },
      },
      _count: true,
      _sum: { dealValue: true },
    });

    monthlyData.push({
      month: `${monthNames[monthDate.getMonth()]} ${monthDate.getFullYear()}`,
      deals: result._count || 0,
      revenue: Number(result._sum.dealValue || 0),
    });
  }

  const [totalWon, totalPipeline] = await Promise.all([
    prisma.deal.aggregate({
      where: { ...ownerFilter, result: "WON" },
      _count: true,
      _sum: { dealValue: true },
    }),
    prisma.deal.aggregate({
      where: { ...ownerFilter, result: "PENDING" },
      _count: true,
      _sum: { dealValue: true },
    }),
  ]);

  return {
    monthlyData,
    totalWonDeals: totalWon._count || 0,
    totalWonRevenue: Number(totalWon._sum.dealValue || 0),
    pipelineDeals: totalPipeline._count || 0,
    pipelineValue: Number(totalPipeline._sum.dealValue || 0),
  };
}

// Source Analysis: Lead source effectiveness
export async function getSourceAnalysis() {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  const viewAll = ["SUPER_ADMIN", "ADMIN", "SALES_MANAGER"].includes(
    session.user.role,
  );
  const ownerFilter: any = viewAll ? {} : { ownerId: session.user.id };

  const [bySource, byChannel, totalLeads] = await Promise.all([
    prisma.lead.groupBy({
      by: ["source"],
      where: { ...ownerFilter, source: { not: null } },
      _count: true,
    }),
    prisma.lead.groupBy({
      by: ["sourceChannel"],
      where: { ...ownerFilter, sourceChannel: { not: null } },
      _count: true,
    }),
    prisma.lead.count({ where: ownerFilter }),
  ]);

  // Get conversion counts per source
  const wonBySource = await prisma.lead.groupBy({
    by: ["source"],
    where: { ...ownerFilter, source: { not: null }, stage: "WON" },
    _count: true,
  });

  const sources = bySource.map((s) => {
    const wonCount =
      wonBySource.find((w) => w.source === s.source)?._count || 0;
    return {
      source: s.source || "Unknown",
      label: (s.source || "UNKNOWN").replace(/_/g, " "),
      count: s._count,
      conversions: wonCount,
      conversionRate:
        s._count > 0 ? Math.round((wonCount / s._count) * 100) : 0,
    };
  });

  const channels = byChannel.map((c) => ({
    channel: c.sourceChannel || "Unknown",
    label: (c.sourceChannel || "UNKNOWN").replace(/_/g, " "),
    count: c._count,
  }));

  return {
    sources: sources.sort((a, b) => b.count - a.count),
    channels: channels.sort((a, b) => b.count - a.count),
    totalLeads,
  };
}

// Commission Breakdown: Summary by agent
export async function getCommissionBreakdown() {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  const viewAll = ["SUPER_ADMIN", "ADMIN", "SALES_MANAGER"].includes(
    session.user.role,
  );
  const agentFilter: any = viewAll ? {} : { agentId: session.user.id };

  const [byStatus, byAgent, totals] = await Promise.all([
    prisma.commission.groupBy({
      by: ["status"],
      where: agentFilter,
      _count: true,
      _sum: { amount: true },
    }),
    prisma.commission.groupBy({
      by: ["agentId"],
      where: agentFilter,
      _count: true,
      _sum: { amount: true },
    }),
    prisma.commission.aggregate({
      where: agentFilter,
      _count: true,
      _sum: { amount: true },
    }),
  ]);

  // Get agent names
  const agentIds = byAgent.map((a) => a.agentId);
  const agents = await prisma.user.findMany({
    where: { id: { in: agentIds } },
    select: { id: true, firstName: true, lastName: true },
  });

  const agentBreakdown = byAgent
    .map((a) => {
      const agent = agents.find((ag) => ag.id === a.agentId);
      return {
        agentId: a.agentId,
        agentName: agent
          ? `${agent.firstName} ${agent.lastName}`
          : "Unknown",
        count: a._count,
        totalAmount: Number(a._sum.amount || 0),
      };
    })
    .sort((a, b) => b.totalAmount - a.totalAmount);

  const statusBreakdown = byStatus.map((s) => ({
    status: s.status,
    count: s._count,
    amount: Number(s._sum.amount || 0),
  }));

  return {
    statusBreakdown,
    agentBreakdown,
    totalCommissions: totals._count || 0,
    totalAmount: Number(totals._sum.amount || 0),
  };
}

// Lost Deals Analysis
export async function getLostDealsAnalysis() {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  const viewAll = ["SUPER_ADMIN", "ADMIN", "SALES_MANAGER"].includes(
    session.user.role,
  );
  const ownerFilter: any = viewAll ? {} : { ownerId: session.user.id };

  const [lostDeals, lostLeads, totalDeals, totalLeads] = await Promise.all([
    prisma.deal.findMany({
      where: { ...ownerFilter, result: "LOST" },
      select: {
        id: true,
        title: true,
        dealNumber: true,
        dealValue: true,
        lostReason: true,
        actualCloseDate: true,
        owner: { select: { firstName: true, lastName: true } },
        client: { select: { firstName: true, lastName: true } },
      },
      orderBy: { actualCloseDate: "desc" },
      take: 50,
    }),
    prisma.lead.findMany({
      where: { ...ownerFilter, stage: "LOST" },
      select: {
        id: true,
        title: true,
        leadNumber: true,
        estimatedValue: true,
        lostReason: true,
        updatedAt: true,
        owner: { select: { firstName: true, lastName: true } },
        client: { select: { firstName: true, lastName: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 50,
    }),
    prisma.deal.count({ where: ownerFilter }),
    prisma.lead.count({ where: ownerFilter }),
  ]);

  // Aggregate lost reasons
  const reasonMap: Record<string, number> = {};
  for (const deal of lostDeals) {
    const reason = deal.lostReason || "Not specified";
    reasonMap[reason] = (reasonMap[reason] || 0) + 1;
  }
  for (const lead of lostLeads) {
    const reason = lead.lostReason || "Not specified";
    reasonMap[reason] = (reasonMap[reason] || 0) + 1;
  }

  const topReasons = Object.entries(reasonMap)
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const lostDealValue = lostDeals.reduce(
    (sum, d) => sum + Number(d.dealValue || 0),
    0,
  );
  const lostLeadValue = lostLeads.reduce(
    (sum, l) => sum + Number(l.estimatedValue || 0),
    0,
  );

  return {
    lostDeals: lostDeals.map((d) => ({
      ...d,
      dealValue: Number(d.dealValue),
    })),
    lostLeads: lostLeads.map((l) => ({
      ...l,
      estimatedValue: Number(l.estimatedValue || 0),
    })),
    topReasons,
    lostDealCount: lostDeals.length,
    lostLeadCount: lostLeads.length,
    lostDealValue,
    lostLeadValue,
    totalLostValue: lostDealValue + lostLeadValue,
    dealLossRate:
      totalDeals > 0
        ? Math.round((lostDeals.length / totalDeals) * 100)
        : 0,
    leadLossRate:
      totalLeads > 0
        ? Math.round((lostLeads.length / totalLeads) * 100)
        : 0,
  };
}
