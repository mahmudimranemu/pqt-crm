"use server";

import { prisma } from "@/lib/prisma";
import { auth, type ExtendedSession } from "@/lib/auth";
import type { AuditAction } from "@prisma/client";

export async function getAuditLogs(params?: {
  entityType?: string;
  entityId?: string;
  action?: AuditAction;
  userId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  if (!["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) {
    throw new Error("Admin access required");
  }

  const {
    entityType,
    entityId,
    action,
    userId,
    startDate,
    endDate,
    page = 1,
    limit = 50,
  } = params || {};

  const where: any = {};
  if (entityType) where.entityType = entityType;
  if (entityId) where.entityId = entityId;
  if (action) where.action = action;
  if (userId) where.userId = userId;
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate);
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { logs, total, page, limit };
}

export async function getEntityAuditLogs(entityType: string, entityId: string) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  return prisma.auditLog.findMany({
    where: { entityType, entityId },
    include: {
      user: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function createAuditLog(data: {
  action: AuditAction;
  entityType: string;
  entityId: string;
  changes?: Record<string, string | number | boolean | null>;
  ipAddress?: string;
  userAgent?: string;
}) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) return;

  await prisma.auditLog.create({
    data: {
      action: data.action,
      entityType: data.entityType,
      entityId: data.entityId,
      changes: data.changes,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      userId: session.user.id,
    },
  });
}
