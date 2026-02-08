"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { auth, type ExtendedSession } from "@/lib/auth";
import type { CallType, CallOutcome } from "@prisma/client";

// Get call logs
export async function getCallLogs(params?: {
  clientId?: string;
  page?: number;
  limit?: number;
}) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  const { clientId, page = 1, limit = 25 } = params || {};
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};

  if (clientId) where.clientId = clientId;

  if (session.user.role === "SALES_AGENT") {
    where.agentId = session.user.id;
  } else if (session.user.role !== "SUPER_ADMIN") {
    const officeAgents = await prisma.user.findMany({
      where: { office: session.user.office },
      select: { id: true },
    });
    where.agentId = { in: officeAgents.map((a) => a.id) };
  }

  const [calls, total] = await Promise.all([
    prisma.callLog.findMany({
      where,
      include: {
        agent: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { callDate: "desc" },
      skip,
      take: limit,
    }),
    prisma.callLog.count({ where }),
  ]);

  // Get client names separately if clientId exists
  const clientIds = [...new Set(calls.filter(c => c.clientId).map(c => c.clientId as string))];
  const clients = clientIds.length > 0
    ? await prisma.client.findMany({
        where: { id: { in: clientIds } },
        select: { id: true, firstName: true, lastName: true },
      })
    : [];

  const callsWithClients = calls.map(call => ({
    ...call,
    client: call.clientId ? clients.find(c => c.id === call.clientId) : null,
  }));

  return { calls: callsWithClients, total, pages: Math.ceil(total / limit), currentPage: page };
}

// Get call stats
export async function getCallStats() {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const thisWeekStart = new Date(today);
  thisWeekStart.setDate(today.getDate() - today.getDay());
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

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
    totalCalls,
    todayCalls,
    weekCalls,
    monthCalls,
    connectedCalls,
    avgDuration,
    byOutcome,
  ] = await Promise.all([
    prisma.callLog.count({ where: baseWhere }),
    prisma.callLog.count({
      where: { ...baseWhere, callDate: { gte: today } },
    }),
    prisma.callLog.count({
      where: { ...baseWhere, callDate: { gte: thisWeekStart } },
    }),
    prisma.callLog.count({
      where: { ...baseWhere, callDate: { gte: thisMonthStart } },
    }),
    prisma.callLog.count({
      where: { ...baseWhere, outcome: "CONNECTED" },
    }),
    prisma.callLog.aggregate({
      where: baseWhere,
      _avg: { duration: true },
    }),
    prisma.callLog.groupBy({
      by: ["outcome"],
      where: baseWhere,
      _count: { id: true },
    }),
  ]);

  const connectionRate = totalCalls > 0 ? (connectedCalls / totalCalls) * 100 : 0;

  return {
    totalCalls,
    todayCalls,
    weekCalls,
    monthCalls,
    connectedCalls,
    connectionRate,
    avgDuration: avgDuration._avg.duration || 0,
    byOutcome,
  };
}

// Log a call
export async function logCall(data: {
  clientId?: string;
  callType: CallType;
  outcome: CallOutcome;
  duration: number;
  notes?: string;
}) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");
  if (session.user.role === "VIEWER") throw new Error("Unauthorized");

  const call = await prisma.callLog.create({
    data: {
      ...data,
      agentId: session.user.id,
    },
  });

  revalidatePath("/communications");
  if (data.clientId) revalidatePath(`/clients/${data.clientId}`);

  return call;
}

// Get clients for call log form
export async function getCallLogFormData() {
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

  return prisma.client.findMany({
    where: clientWhere,
    select: { id: true, firstName: true, lastName: true, phone: true },
    orderBy: { firstName: "asc" },
  });
}
