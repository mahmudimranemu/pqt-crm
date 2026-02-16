"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth, type ExtendedSession } from "@/lib/auth";
import type { CampaignStatus, LeadSource, SourceChannel } from "@prisma/client";

export async function getCampaigns(params?: {
  status?: CampaignStatus;
  page?: number;
  limit?: number;
}) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  const { status, page = 1, limit = 50 } = params || {};
  const where: any = {};
  if (status) where.status = status;

  const [campaigns, total] = await Promise.all([
    prisma.campaign.findMany({
      where,
      include: { _count: { select: { steps: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.campaign.count({ where }),
  ]);

  return { campaigns, total, page, limit };
}

export async function getCampaignById(id: string) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: { steps: { orderBy: { stepOrder: "asc" } } },
  });

  if (!campaign) throw new Error("Campaign not found");
  return campaign;
}

export async function createCampaign(data: {
  name: string;
  description?: string;
  source?: LeadSource;
  channel?: SourceChannel;
  budget?: number;
  startDate?: string;
  endDate?: string;
}) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  if (!["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) {
    throw new Error("Admin access required");
  }

  const campaign = await prisma.campaign.create({
    data: {
      name: data.name,
      description: data.description,
      source: data.source,
      channel: data.channel,
      budget: data.budget,
      startDate: data.startDate ? new Date(data.startDate) : null,
      endDate: data.endDate ? new Date(data.endDate) : null,
    },
  });

  revalidatePath("/campaigns");
  return campaign;
}

export async function updateCampaign(
  id: string,
  data: {
    name?: string;
    description?: string;
    status?: CampaignStatus;
    source?: LeadSource;
    channel?: SourceChannel;
    budget?: number;
    spent?: number;
    leadsGenerated?: number;
    conversions?: number;
    startDate?: string;
    endDate?: string;
  },
) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  if (!["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) {
    throw new Error("Admin access required");
  }

  const { startDate, endDate, ...rest } = data;

  const campaign = await prisma.campaign.update({
    where: { id },
    data: {
      ...rest,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    },
  });

  revalidatePath("/campaigns");
  return campaign;
}

export async function deleteCampaign(id: string) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  if (!["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) {
    throw new Error("Admin access required");
  }

  await prisma.campaign.delete({ where: { id } });
  revalidatePath("/campaigns");
}

export async function addCampaignStep(
  campaignId: string,
  data: {
    name: string;
    type: string;
    config?: Record<string, string | number | boolean | null>;
    delayDays?: number;
  },
) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  if (!["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) {
    throw new Error("Admin access required");
  }

  const lastStep = await prisma.campaignStep.findFirst({
    where: { campaignId },
    orderBy: { stepOrder: "desc" },
  });

  const step = await prisma.campaignStep.create({
    data: {
      campaignId,
      stepOrder: (lastStep?.stepOrder || 0) + 1,
      name: data.name,
      type: data.type,
      config: data.config,
      delayDays: data.delayDays || 0,
    },
  });

  revalidatePath(`/campaigns/${campaignId}`);
  return step;
}

export async function getCampaignStats() {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  const [activeCampaigns, totalLeads, totalConversions, totalSpent] =
    await Promise.all([
      prisma.campaign.count({ where: { status: "ACTIVE" } }),
      prisma.campaign.aggregate({ _sum: { leadsGenerated: true } }),
      prisma.campaign.aggregate({ _sum: { conversions: true } }),
      prisma.campaign.aggregate({ _sum: { spent: true } }),
    ]);

  return {
    activeCampaigns,
    totalLeads: totalLeads._sum.leadsGenerated || 0,
    totalConversions: totalConversions._sum.conversions || 0,
    totalSpent: Number(totalSpent._sum.spent || 0),
    conversionRate: totalLeads._sum.leadsGenerated
      ? Math.round(
          ((totalConversions._sum.conversions || 0) /
            totalLeads._sum.leadsGenerated) *
            100,
        )
      : 0,
  };
}
