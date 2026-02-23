"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth, type ExtendedSession } from "@/lib/auth";
import type { TaskStatus, TaskPriority } from "@prisma/client";
import { auditLog } from "@/lib/audit";

export async function getTasks(params?: {
  search?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string;
  leadId?: string;
  dealId?: string;
  page?: number;
  limit?: number;
}) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  const {
    search,
    status,
    priority,
    assigneeId,
    leadId,
    dealId,
    page = 1,
    limit = 50,
  } = params || {};
  const viewAll = ["SUPER_ADMIN", "ADMIN", "SALES_MANAGER"].includes(
    session.user.role,
  );

  const where: any = {};
  if (!viewAll) where.assigneeId = session.user.id;
  else if (assigneeId) where.assigneeId = assigneeId;

  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (leadId) where.leadId = leadId;
  if (dealId) where.dealId = dealId;

  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  const [tasks, total] = await Promise.all([
    prisma.task.findMany({
      where,
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        lead: { select: { id: true, leadNumber: true, title: true } },
        deal: { select: { id: true, dealNumber: true, title: true } },
      },
      orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.task.count({ where }),
  ]);

  return { tasks, total, page, limit };
}

export async function getMyTasks() {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  return prisma.task.findMany({
    where: {
      assigneeId: session.user.id,
      status: { in: ["TODO", "IN_PROGRESS"] },
    },
    include: {
      lead: { select: { id: true, leadNumber: true, title: true } },
      deal: { select: { id: true, dealNumber: true, title: true } },
    },
    orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
    take: 10,
  });
}

export async function getTaskById(id: string) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      assignee: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
      createdBy: { select: { id: true, firstName: true, lastName: true } },
      lead: { select: { id: true, leadNumber: true, title: true } },
      deal: { select: { id: true, dealNumber: true, title: true } },
    },
  });

  if (!task) throw new Error("Task not found");
  return task;
}

export async function createTaskAction(data: {
  title: string;
  description?: string;
  priority?: TaskPriority;
  dueDate?: string;
  assigneeId?: string;
  leadId?: string;
  dealId?: string;
}) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  const task = await prisma.task.create({
    data: {
      title: data.title,
      description: data.description,
      priority: data.priority || "MEDIUM",
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      assigneeId: data.assigneeId || session.user.id,
      createdById: session.user.id,
      leadId: data.leadId,
      dealId: data.dealId,
    },
  });

  await auditLog("CREATE", "Task", task.id, {
    title: data.title,
    priority: data.priority,
  });

  revalidatePath("/tasks");
  return task;
}

export async function updateTaskAction(
  id: string,
  data: {
    title?: string;
    description?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    dueDate?: string;
    assigneeId?: string;
  },
) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  const task = await prisma.task.update({
    where: { id },
    data: {
      ...data,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      completedAt:
        data.status === "DONE" ? new Date() : data.status ? null : undefined,
    },
  });

  await auditLog("UPDATE", "Task", id, {
    title: data.title,
    status: data.status,
  });

  revalidatePath("/tasks");
  return task;
}

export async function updateTaskStatus(id: string, status: TaskStatus) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  const task = await prisma.task.update({
    where: { id },
    data: {
      status,
      completedAt: status === "DONE" ? new Date() : null,
    },
  });

  revalidatePath("/tasks");
  return task;
}

export async function deleteTaskAction(id: string) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  await prisma.task.delete({ where: { id } });

  await auditLog("DELETE", "Task", id);

  revalidatePath("/tasks");
}

export async function getTodayAgenda() {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

  const viewAll = ["SUPER_ADMIN", "ADMIN", "SALES_MANAGER"].includes(session.user.role);

  const taskWhere: any = {
    dueDate: { gte: startOfDay, lt: endOfDay },
    status: { in: ["TODO", "IN_PROGRESS"] },
  };
  if (!viewAll) taskWhere.assigneeId = session.user.id;

  const bookingWhere: any = {
    bookingDate: { gte: startOfDay, lt: endOfDay },
  };
  if (!viewAll) bookingWhere.agentId = session.user.id;

  const [tasks, bookings, overdueTasks] = await Promise.all([
    prisma.task.findMany({
      where: taskWhere,
      include: {
        assignee: { select: { firstName: true, lastName: true } },
      },
      orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
      take: 5,
    }),
    prisma.booking.findMany({
      where: bookingWhere,
      include: {
        client: { select: { firstName: true, lastName: true } },
        property: { select: { name: true } },
        agent: { select: { firstName: true, lastName: true } },
      },
      orderBy: { bookingDate: "asc" },
      take: 5,
    }),
    prisma.task.count({
      where: {
        ...(viewAll ? {} : { assigneeId: session.user.id }),
        status: { in: ["TODO", "IN_PROGRESS"] },
        dueDate: { lt: startOfDay },
      },
    }),
  ]);

  return { tasks, bookings, overdueTasks };
}

export async function getOverdueTasksCount() {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  const viewAll = ["SUPER_ADMIN", "ADMIN", "SALES_MANAGER"].includes(
    session.user.role,
  );
  const where: any = {
    status: { in: ["TODO", "IN_PROGRESS"] },
    dueDate: { lt: new Date() },
  };
  if (!viewAll) where.assigneeId = session.user.id;

  return prisma.task.count({ where });
}
