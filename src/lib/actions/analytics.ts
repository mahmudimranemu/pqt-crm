"use server";

import prisma from "@/lib/prisma";
import { auth, type ExtendedSession } from "@/lib/auth";

export async function getConversionFunnel() {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  const [enquiries, leads, deals, wonDeals] = await Promise.all([
    prisma.enquiry.count(),
    prisma.lead.count(),
    prisma.deal.count(),
    prisma.deal.count({ where: { result: "WON" } }),
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

  const sources = await prisma.lead.groupBy({
    by: ["source"],
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

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const deals = await prisma.deal.findMany({
    where: {
      result: { in: ["WON", "LOST"] },
      updatedAt: { gte: sixMonthsAgo },
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

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const sales = await prisma.sale.findMany({
    where: { createdAt: { gte: sixMonthsAgo } },
    select: { salePrice: true, createdAt: true },
  });

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
