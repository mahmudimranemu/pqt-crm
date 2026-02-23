"use server";

import prisma from "@/lib/prisma";
import { auth, type ExtendedSession } from "@/lib/auth";

export async function getConversionFunnel() {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  const isAgent = session.user.role === "SALES_AGENT";
  const userId = session.user.id;

  const [enquiries, leads, deals, wonDeals] = await Promise.all([
    prisma.enquiry.count(
      isAgent ? { where: { assignedAgentId: userId } } : undefined,
    ),
    prisma.lead.count(isAgent ? { where: { ownerId: userId } } : undefined),
    prisma.deal.count(isAgent ? { where: { ownerId: userId } } : undefined),
    prisma.deal.count({
      where: { result: "WON", ...(isAgent ? { ownerId: userId } : {}) },
    }),
  ]);

  return [
    { stage: "Enquiries", count: enquiries },
    { stage: "Leads", count: leads },
    { stage: "Deals", count: deals },
    { stage: "Won", count: wonDeals },
  ];
}

export async function getSourceBreakdown() {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  const isAgent = session.user.role === "SALES_AGENT";

  const sources = await prisma.lead.groupBy({
    by: ["source"],
    where: isAgent ? { ownerId: session.user.id } : undefined,
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
  });

  return sources.map((s) => ({
    source: s.source.replace(/_/g, " "),
    count: s._count.id,
  }));
}

export async function getWonVsLost() {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  const isAgent = session.user.role === "SALES_AGENT";
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const deals = await prisma.deal.findMany({
    where: {
      result: { in: ["WON", "LOST"] },
      updatedAt: { gte: sixMonthsAgo },
      ...(isAgent ? { ownerId: session.user.id } : {}),
    },
    select: { result: true, updatedAt: true },
  });

  const months: Record<string, { won: number; lost: number }> = {};
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.toLocaleDateString("en-US", {
      month: "short",
      year: "2-digit",
    });
    months[key] = { won: 0, lost: 0 };
  }

  deals.forEach((deal) => {
    const key = deal.updatedAt.toLocaleDateString("en-US", {
      month: "short",
      year: "2-digit",
    });
    if (months[key]) {
      if (deal.result === "WON") months[key].won++;
      else months[key].lost++;
    }
  });

  return Object.entries(months).map(([month, data]) => ({
    month,
    won: data.won,
    lost: data.lost,
  }));
}

export async function getRevenueTrend() {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  const isAgent = session.user.role === "SALES_AGENT";
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  // Query won deals for revenue (primary source) + sales for legacy data
  const [deals, sales] = await Promise.all([
    prisma.deal.findMany({
      where: {
        result: "WON",
        updatedAt: { gte: sixMonthsAgo },
        ...(isAgent ? { ownerId: session.user.id } : {}),
      },
      select: { dealValue: true, updatedAt: true },
    }),
    prisma.sale.findMany({
      where: {
        createdAt: { gte: sixMonthsAgo },
        ...(isAgent ? { agentId: session.user.id } : {}),
      },
      select: { salePrice: true, createdAt: true },
    }),
  ]);

  const months: Record<string, number> = {};
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.toLocaleDateString("en-US", {
      month: "short",
      year: "2-digit",
    });
    months[key] = 0;
  }

  // Add deal revenue
  deals.forEach((deal) => {
    const key = deal.updatedAt.toLocaleDateString("en-US", {
      month: "short",
      year: "2-digit",
    });
    if (months[key]) {
      months[key] += Number(deal.dealValue || 0);
    }
  });

  // Add legacy sale revenue
  sales.forEach((sale) => {
    const key = sale.createdAt.toLocaleDateString("en-US", {
      month: "short",
      year: "2-digit",
    });
    if (months[key]) {
      months[key] += Number(sale.salePrice);
    }
  });

  return Object.entries(months).map(([month, revenue]) => ({
    month,
    revenue,
  }));
}
