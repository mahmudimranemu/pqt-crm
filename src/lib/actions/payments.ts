"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth, type ExtendedSession } from "@/lib/auth";
import type { PaymentStatus, PaymentMethod, Currency } from "@prisma/client";
import { auditLog } from "@/lib/audit";

export async function getPayments(params?: {
  dealId?: string;
  clientId?: string;
  status?: PaymentStatus;
  page?: number;
  limit?: number;
}) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  const { dealId, clientId, status, page = 1, limit = 50 } = params || {};
  const viewAll = ["SUPER_ADMIN", "ADMIN", "SALES_MANAGER"].includes(
    session.user.role,
  );

  const where: any = {};
  if (dealId) where.dealId = dealId;
  if (clientId) where.clientId = clientId;
  if (status) where.status = status;
  if (!viewAll) where.deal = { ownerId: session.user.id };

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: {
        deal: { select: { id: true, dealNumber: true, title: true } },
        client: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { dueDate: "asc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.payment.count({ where }),
  ]);

  return { payments, total, page, limit };
}

export async function createPayment(data: {
  amount: number;
  currency?: Currency;
  method?: PaymentMethod;
  reference?: string;
  dueDate?: string;
  notes?: string;
  dealId: string;
  clientId: string;
}) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  const payment = await prisma.payment.create({
    data: {
      amount: data.amount,
      currency: data.currency || "USD",
      method: data.method,
      reference: data.reference,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      notes: data.notes,
      dealId: data.dealId,
      clientId: data.clientId,
    },
  });

  await auditLog("CREATE", "Payment", payment.id, {
    amount: data.amount,
    method: data.method,
  });

  revalidatePath(`/deals/${data.dealId}`);
  return payment;
}

export async function markPaymentReceived(
  id: string,
  method?: PaymentMethod,
  reference?: string,
) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  const payment = await prisma.payment.update({
    where: { id },
    data: {
      status: "RECEIVED",
      method: method || undefined,
      reference: reference || undefined,
      receivedAt: new Date(),
    },
  });

  revalidatePath(`/deals/${payment.dealId}`);
  return payment;
}

export async function deletePayment(id: string) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  if (!["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) {
    throw new Error("Admin access required");
  }

  const payment = await prisma.payment.delete({ where: { id } });

  await auditLog("DELETE", "Payment", id);

  revalidatePath(`/deals/${payment.dealId}`);
}

export async function getDealPaymentSummary(dealId: string) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  const [payments, deal] = await Promise.all([
    prisma.payment.findMany({ where: { dealId } }),
    prisma.deal.findUnique({
      where: { id: dealId },
      select: { dealValue: true, currency: true },
    }),
  ]);

  const totalReceived = payments
    .filter((p) => p.status === "RECEIVED")
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const totalPending = payments
    .filter((p) => p.status === "PENDING")
    .reduce((sum, p) => sum + Number(p.amount), 0);

  return {
    dealValue: deal?.dealValue ? Number(deal.dealValue) : 0,
    totalReceived,
    totalPending,
    remaining: (deal?.dealValue ? Number(deal.dealValue) : 0) - totalReceived,
    paymentCount: payments.length,
  };
}
