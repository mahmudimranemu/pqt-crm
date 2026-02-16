"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth, type ExtendedSession } from "@/lib/auth";
import type { CommissionStatus, Currency } from "@prisma/client";
import { auditLog } from "@/lib/audit";

export async function getCommissions(params?: {
  agentId?: string;
  dealId?: string;
  status?: CommissionStatus;
  page?: number;
  limit?: number;
}) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  const { agentId, dealId, status, page = 1, limit = 50 } = params || {};
  const viewAll = ["SUPER_ADMIN", "ADMIN", "SALES_MANAGER"].includes(
    session.user.role,
  );

  const where: any = {};
  if (!viewAll) where.agentId = session.user.id;
  else if (agentId) where.agentId = agentId;

  if (dealId) where.dealId = dealId;
  if (status) where.status = status;

  const [commissions, total] = await Promise.all([
    prisma.commission.findMany({
      where,
      include: {
        deal: {
          select: { id: true, dealNumber: true, title: true, dealValue: true },
        },
        agent: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.commission.count({ where }),
  ]);

  return { commissions, total, page, limit };
}

export async function createCommission(data: {
  amount: number;
  currency?: Currency;
  percentage?: number;
  dealId: string;
  agentId: string;
  notes?: string;
}) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  if (!["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) {
    throw new Error("Admin access required");
  }

  const commission = await prisma.commission.create({
    data: {
      amount: data.amount,
      currency: data.currency || "USD",
      percentage: data.percentage,
      dealId: data.dealId,
      agentId: data.agentId,
      notes: data.notes,
    },
  });

  await auditLog("CREATE", "Commission", commission.id, {
    amount: data.amount,
  });

  revalidatePath(`/deals/${data.dealId}`);
  return commission;
}

export async function approveCommission(id: string) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  if (!["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) {
    throw new Error("Admin access required");
  }

  const commission = await prisma.commission.update({
    where: { id },
    data: { status: "APPROVED" },
  });

  await auditLog("UPDATE", "Commission", id, { status: "APPROVED" });

  revalidatePath(`/deals/${commission.dealId}`);
  return commission;
}

export async function markCommissionPaid(id: string) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  if (!["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) {
    throw new Error("Admin access required");
  }

  const commission = await prisma.commission.update({
    where: { id },
    data: { status: "PAID", paidAt: new Date() },
  });

  await auditLog("UPDATE", "Commission", id, { status: "PAID" });

  revalidatePath(`/deals/${commission.dealId}`);
  return commission;
}

export async function getAgentCommissionSummary(agentId?: string) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  const targetId = agentId || session.user.id;

  const [pending, approved, paid] = await Promise.all([
    prisma.commission.aggregate({
      where: { agentId: targetId, status: "PENDING" },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.commission.aggregate({
      where: { agentId: targetId, status: "APPROVED" },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.commission.aggregate({
      where: { agentId: targetId, status: "PAID" },
      _sum: { amount: true },
      _count: true,
    }),
  ]);

  return {
    pending: {
      amount: Number(pending._sum.amount || 0),
      count: pending._count,
    },
    approved: {
      amount: Number(approved._sum.amount || 0),
      count: approved._count,
    },
    paid: { amount: Number(paid._sum.amount || 0), count: paid._count },
    total:
      Number(pending._sum.amount || 0) +
      Number(approved._sum.amount || 0) +
      Number(paid._sum.amount || 0),
  };
}
