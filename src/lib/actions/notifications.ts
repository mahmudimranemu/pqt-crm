"use server";

import prisma from "@/lib/prisma";
import { auth, type ExtendedSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// ─── Queries ─────────────────────────────────────────────

export async function getUnreadNotificationCount(): Promise<number> {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user?.id) return 0;

  return prisma.notification.count({
    where: { userId: session.user.id, isRead: false },
  });
}

export async function getLatestNotifications(limit = 5) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user?.id) return [];

  return prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getNotifications(page = 1, limit = 20) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user?.id) return { notifications: [], total: 0 };

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.notification.count({ where: { userId: session.user.id } }),
  ]);

  return { notifications, total };
}

// ─── Mutations ───────────────────────────────────────────

export async function markAsRead(id: string) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user?.id) throw new Error("Unauthorized");

  await prisma.notification.update({
    where: { id, userId: session.user.id },
    data: { isRead: true },
  });

  revalidatePath("/", "layout");
}

export async function markAllAsRead() {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user?.id) throw new Error("Unauthorized");

  await prisma.notification.updateMany({
    where: { userId: session.user.id, isRead: false },
    data: { isRead: true },
  });

  revalidatePath("/", "layout");
}
