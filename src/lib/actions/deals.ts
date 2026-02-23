"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth, type ExtendedSession } from "@/lib/auth";
import type {
  DealStage,
  DealResult,
  Currency,
  PropertyType,
} from "@prisma/client";
import { notify, notifySuperAdmins, notifyUserAndAdmins } from "@/lib/notifications";
import { auditLog } from "@/lib/audit";

interface CreateDealData {
  title: string;
  description?: string;
  dealValue: number;
  currency?: Currency;
  stage?: DealStage;
  propertyType?: PropertyType;
  propertyName?: string;
  unitNumber?: string;
  expectedCloseDate?: string;
  clientId: string;
  ownerId?: string;
}

interface UpdateDealData extends Partial<CreateDealData> {
  id: string;
  result?: DealResult;
  probability?: number;
  lostReason?: string;
  actualCloseDate?: string;
}

async function generateDealNumber(): Promise<string> {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
  const prefix = `PQT-D-${dateStr}`;
  const count = await prisma.deal.count({
    where: { dealNumber: { startsWith: prefix } },
  });
  return `${prefix}-${String(count + 1).padStart(4, "0")}`;
}

export async function getDeals(params?: {
  search?: string;
  stage?: DealStage;
  result?: DealResult;
  ownerId?: string;
  page?: number;
  limit?: number;
}) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  const { search, stage, result, ownerId, page = 1, limit = 50 } = params || {};
  const viewAll = ["SUPER_ADMIN", "ADMIN", "SALES_MANAGER"].includes(
    session.user.role,
  );

  const where: any = {};
  if (!viewAll) where.ownerId = session.user.id;
  else if (ownerId) where.ownerId = ownerId;

  if (stage) where.stage = stage;
  if (result) where.result = result;

  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { dealNumber: { contains: search, mode: "insensitive" } },
      { client: { firstName: { contains: search, mode: "insensitive" } } },
      { client: { lastName: { contains: search, mode: "insensitive" } } },
    ];
  }

  const [deals, total] = await Promise.all([
    prisma.deal.findMany({
      where,
      include: {
        owner: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        _count: { select: { activities: true, tasks: true, payments: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.deal.count({ where }),
  ]);

  return { deals, total, page, limit };
}

export async function getDealsByStage() {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  const viewAll = ["SUPER_ADMIN", "ADMIN", "SALES_MANAGER"].includes(
    session.user.role,
  );
  const where: any = { result: "PENDING" };
  if (!viewAll) where.ownerId = session.user.id;

  const deals = await prisma.deal.findMany({
    where,
    include: {
      owner: { select: { id: true, firstName: true, lastName: true } },
      client: {
        select: { id: true, firstName: true, lastName: true, phone: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const serializedDeals = deals.map((deal) => ({
    ...deal,
    dealValue: deal.dealValue ? Number(deal.dealValue) : null,
  }));

  const stages: Record<string, typeof serializedDeals> = {};
  for (const deal of serializedDeals) {
    if (!stages[deal.stage]) stages[deal.stage] = [];
    stages[deal.stage].push(deal);
  }

  return stages;
}

export async function getDealById(id: string) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  const deal = await prisma.deal.findUnique({
    where: { id },
    include: {
      owner: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
      client: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          whatsapp: true,
          nationality: true,
        },
      },
      fromLead: { select: { id: true, leadNumber: true, title: true } },
      activities: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { user: { select: { firstName: true, lastName: true } } },
      },
      tasks: {
        orderBy: { dueDate: "asc" },
        include: { assignee: { select: { firstName: true, lastName: true } } },
      },
      payments: { orderBy: { dueDate: "asc" } },
      commissions: {
        include: { agent: { select: { firstName: true, lastName: true } } },
      },
    },
  });

  if (!deal) throw new Error("Deal not found");

  const viewAll = ["SUPER_ADMIN", "ADMIN", "SALES_MANAGER"].includes(
    session.user.role,
  );
  if (!viewAll && deal.ownerId !== session.user.id) {
    throw new Error("Access denied");
  }

  return {
    ...deal,
    dealValue: Number(deal.dealValue),
    payments: deal.payments.map((p) => ({
      ...p,
      amount: Number(p.amount),
    })),
    commissions: deal.commissions.map((c) => ({
      ...c,
      amount: Number(c.amount),
      percentage: c.percentage ? Number(c.percentage) : null,
    })),
  };
}

export async function createDeal(data: CreateDealData) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  const dealNumber = await generateDealNumber();

  const deal = await prisma.deal.create({
    data: {
      dealNumber,
      title: data.title,
      description: data.description,
      dealValue: data.dealValue,
      currency: data.currency || "USD",
      stage: data.stage || "RESERVATION",
      propertyType: data.propertyType,
      propertyName: data.propertyName,
      unitNumber: data.unitNumber,
      expectedCloseDate: data.expectedCloseDate
        ? new Date(data.expectedCloseDate)
        : null,
      clientId: data.clientId,
      ownerId: data.ownerId || session.user.id,
    },
  });

  await prisma.activity.create({
    data: {
      type: "NOTE",
      title: "Deal Created",
      description: `Created deal: ${data.title} (${dealNumber})`,
      dealId: deal.id,
      clientId: data.clientId,
      userId: session.user.id,
    },
  });

  await auditLog("CREATE", "Deal", deal.id, { title: data.title });

  // Notify assigned owner + super admins
  const ownerId = data.ownerId || session.user.id;
  if (ownerId !== session.user.id) {
    await notifyUserAndAdmins(
      ownerId,
      "DEAL_STAGE_CHANGED",
      "New Deal Created",
      `Deal "${data.title}" (${dealNumber}) has been created and assigned to you`,
      `/deals/${deal.id}`,
    );
  } else {
    await notifySuperAdmins(
      "DEAL_STAGE_CHANGED",
      "New Deal Created",
      `Deal "${data.title}" (${dealNumber}) created by ${session.user.firstName} ${session.user.lastName}`,
      `/deals/${deal.id}`,
    );
  }

  revalidatePath("/deals");
  return deal;
}

export async function updateDeal(data: UpdateDealData) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  const { id, expectedCloseDate, actualCloseDate, ...rest } = data;

  const deal = await prisma.deal.update({
    where: { id },
    data: {
      ...rest,
      expectedCloseDate: expectedCloseDate
        ? new Date(expectedCloseDate)
        : undefined,
      actualCloseDate: actualCloseDate ? new Date(actualCloseDate) : undefined,
    },
  });

  revalidatePath("/deals");
  revalidatePath(`/deals/${id}`);
  return deal;
}

export async function bulkDeleteDeals(ids: string[]) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");
  if (session.user.role !== "SUPER_ADMIN")
    throw new Error("Unauthorized: Only SUPER_ADMIN can bulk delete");

  await prisma.deal.deleteMany({
    where: { id: { in: ids } },
  });

  revalidatePath("/deals");
}

export async function updateDealStage(id: string, stage: DealStage) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  const deal = await prisma.deal.update({
    where: { id },
    data: {
      stage,
      result:
        stage === "COMPLETED"
          ? "WON"
          : stage === "CANCELLED"
            ? "CANCELLED"
            : undefined,
      actualCloseDate: stage === "COMPLETED" ? new Date() : undefined,
    },
  });

  await auditLog("STAGE_CHANGE", "Deal", id, { stage });

  await prisma.activity.create({
    data: {
      type: "STAGE_CHANGE",
      title: "Deal Stage Changed",
      description: `Deal stage changed to ${stage}`,
      dealId: id,
      clientId: deal.clientId,
      userId: session.user.id,
    },
  });

  // Notify deal owner + super admins of stage change
  if (deal.ownerId !== session.user.id) {
    await notifyUserAndAdmins(
      deal.ownerId,
      "DEAL_STAGE_CHANGED",
      "Deal Stage Updated",
      `Deal stage changed to ${stage.replace(/_/g, " ")}`,
      `/deals/${id}`,
    );
  } else {
    await notifySuperAdmins(
      "DEAL_STAGE_CHANGED",
      "Deal Stage Updated",
      `Deal stage changed to ${stage.replace(/_/g, " ")}`,
      `/deals/${id}`,
    );
  }

  revalidatePath("/deals");
  return deal;
}

export async function deleteDeal(id: string) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  if (!["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) {
    throw new Error("No permission to delete deals");
  }

  await prisma.deal.delete({ where: { id } });
  await auditLog("DELETE", "Deal", id);
  revalidatePath("/deals");
}

export async function getDealStats() {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  const viewAll = ["SUPER_ADMIN", "ADMIN", "SALES_MANAGER"].includes(
    session.user.role,
  );
  const where: any = viewAll ? {} : { ownerId: session.user.id };

  const [total, byStage, totalValue, wonDeals] = await Promise.all([
    prisma.deal.count({ where }),
    prisma.deal.groupBy({
      by: ["stage"],
      where: { ...where, result: "PENDING" },
      _count: true,
      _sum: { dealValue: true },
    }),
    prisma.deal.aggregate({
      where: { ...where, result: "PENDING" },
      _sum: { dealValue: true },
    }),
    prisma.deal.aggregate({
      where: { ...where, result: "WON" },
      _count: true,
      _sum: { dealValue: true },
    }),
  ]);

  return {
    total,
    pipelineValue: Number(totalValue._sum.dealValue || 0),
    wonCount: wonDeals._count || 0,
    wonValue: Number(wonDeals._sum.dealValue || 0),
    byStage: byStage.map((s) => ({
      stage: s.stage,
      count: s._count,
      value: Number(s._sum.dealValue || 0),
    })),
  };
}

export async function closeDealWon(id: string) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  const deal = await prisma.deal.update({
    where: { id },
    data: {
      stage: "COMPLETED",
      result: "WON",
      actualCloseDate: new Date(),
    },
    include: { owner: { select: { firstName: true, lastName: true } } },
  });

  await auditLog("UPDATE", "Deal", id, { stage: "COMPLETED", result: "WON" });

  // Log activity
  await prisma.activity.create({
    data: {
      type: "STAGE_CHANGE",
      title: "Deal Won",
      description: `Deal closed as WON. Value: ${deal.currency} ${Number(deal.dealValue).toLocaleString()}`,
      dealId: id,
      clientId: deal.clientId,
      userId: session.user.id,
    },
  });

  // Auto-create commission record for deal owner
  await prisma.commission.create({
    data: {
      dealId: id,
      agentId: deal.ownerId,
      amount: Number(deal.dealValue) * 0.03, // 3% default commission
      currency: deal.currency,
      status: "PENDING",
    },
  });

  // Notify deal owner
  if (deal.ownerId !== session.user.id) {
    await notify(
      deal.ownerId,
      "DEAL_STAGE_CHANGED",
      "Deal Won!",
      `Congratulations! Deal "${deal.title}" has been marked as won.`,
      `/deals/${id}`,
    );
  }

  // Notify admins about commission
  const admins = await prisma.user.findMany({
    where: { role: { in: ["SUPER_ADMIN", "ADMIN"] }, isActive: true },
    select: { id: true },
  });
  for (const admin of admins) {
    if (admin.id !== session.user.id) {
      await notify(
        admin.id,
        "COMMISSION_APPROVED",
        "New Commission Pending",
        `Commission created for deal "${deal.title}" - awaiting approval`,
        `/commissions`,
      );
    }
  }

  revalidatePath("/deals");
  revalidatePath(`/deals/${id}`);
  revalidatePath("/commissions");
  return deal;
}

export async function closeDealLost(id: string, lostReason: string) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  if (!lostReason || lostReason.trim().length === 0) {
    throw new Error("Lost reason is required when closing a deal as lost");
  }

  const deal = await prisma.deal.update({
    where: { id },
    data: {
      stage: "CANCELLED",
      result: "LOST",
      lostReason: lostReason.trim(),
      actualCloseDate: new Date(),
    },
  });

  await auditLog("UPDATE", "Deal", id, {
    stage: "CANCELLED",
    result: "LOST",
    lostReason: lostReason.trim(),
  });

  // Log activity
  await prisma.activity.create({
    data: {
      type: "STAGE_CHANGE",
      title: "Deal Lost",
      description: `Deal closed as LOST. Reason: ${lostReason.trim()}`,
      dealId: id,
      clientId: deal.clientId,
      userId: session.user.id,
    },
  });

  // Notify deal owner
  if (deal.ownerId !== session.user.id) {
    await notify(
      deal.ownerId,
      "DEAL_STAGE_CHANGED",
      "Deal Lost",
      `Deal "${deal.title}" has been marked as lost.`,
      `/deals/${id}`,
    );
  }

  revalidatePath("/deals");
  revalidatePath(`/deals/${id}`);
  return deal;
}
