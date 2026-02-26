"use server";

import prisma from "@/lib/prisma";
import { auth, type ExtendedSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { toUserSlug } from "@/lib/utils";
import { notify } from "@/lib/notifications";

// =====================
// Helpers
// =====================

async function requireAuth() {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");
  return session;
}

async function requireSuperAdmin() {
  const session = await requireAuth();
  if (session.user.role !== "SUPER_ADMIN") {
    throw new Error("Unauthorized - Super Admin access required");
  }
  return session;
}

// =====================
// User Profile
// =====================

export async function getUserBySlug(slug: string) {
  const session = await requireAuth();

  if (!slug || slug.length < 2) throw new Error("Invalid user slug");

  // Fetch all active users and match by generated slug
  // This handles multi-word first/last names correctly
  const users = await prisma.user.findMany({
    where: {
      NOT: { email: { startsWith: "deleted_" } },
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      office: true,
      isActive: true,
      phone: true,
      avatar: true,
      lastSeen: true,
      createdAt: true,
    },
  });

  const user = users.find(
    (u) => toUserSlug(u.firstName, u.lastName) === slug.toLowerCase(),
  );

  if (!user) throw new Error("User not found");

  // Access control: SUPER_ADMIN can view any profile, users can view their own
  const isSuperAdmin = session.user.role === "SUPER_ADMIN";
  const isSelf = session.user.id === user.id;
  if (!isSuperAdmin && !isSelf) {
    throw new Error("Access denied");
  }

  return user;
}

// =====================
// Profile Stats (SUPER_ADMIN or self)
// =====================

export async function getUserProfileStats(userId: string) {
  const session = await requireAuth();
  const isSuperAdmin = session.user.role === "SUPER_ADMIN";
  const isSelf = session.user.id === userId;
  if (!isSuperAdmin && !isSelf) throw new Error("Access denied");

  const [
    totalEnquiries,
    totalLeads,
    totalClients,
    totalDeals,
    wonDeals,
    totalSales,
  ] = await Promise.all([
    prisma.enquiry.count({ where: { assignedAgentId: userId } }),
    prisma.lead.count({ where: { ownerId: userId } }),
    prisma.client.count({ where: { assignedAgentId: userId } }),
    prisma.deal.count({ where: { ownerId: userId } }),
    prisma.deal.count({ where: { ownerId: userId, result: "WON" } }),
    prisma.sale.count({ where: { agentId: userId } }),
  ]);

  const conversionRate =
    totalLeads > 0 ? Math.round((wonDeals / totalLeads) * 100) : 0;

  // Monthly activity for last 6 months
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  const [enquiriesByMonth, leadsByMonth] = await Promise.all([
    prisma.enquiry.groupBy({
      by: ["createdAt"],
      where: {
        assignedAgentId: userId,
        createdAt: { gte: sixMonthsAgo },
      },
      _count: true,
    }),
    prisma.lead.groupBy({
      by: ["createdAt"],
      where: {
        ownerId: userId,
        createdAt: { gte: sixMonthsAgo },
      },
      _count: true,
    }),
  ]);

  // Aggregate by month
  const monthMap: Record<string, { enquiries: number; leads: number }> = {};
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.toLocaleString("default", { month: "short", year: "2-digit" });
    monthMap[key] = { enquiries: 0, leads: 0 };
  }

  for (const e of enquiriesByMonth) {
    const d = new Date(e.createdAt);
    const key = d.toLocaleString("default", { month: "short", year: "2-digit" });
    if (monthMap[key]) monthMap[key].enquiries += e._count;
  }

  for (const l of leadsByMonth) {
    const d = new Date(l.createdAt);
    const key = d.toLocaleString("default", { month: "short", year: "2-digit" });
    if (monthMap[key]) monthMap[key].leads += l._count;
  }

  const activityByMonth = Object.entries(monthMap).map(([month, data]) => ({
    month,
    enquiries: data.enquiries,
    leads: data.leads,
  }));

  return {
    totalEnquiries,
    totalLeads,
    totalClients,
    totalDeals,
    wonDeals,
    totalSales,
    conversionRate,
    activityByMonth,
  };
}

// =====================
// User Enquiries
// =====================

export async function getUserEnquiries(userId: string, page = 1) {
  const session = await requireAuth();
  const isSuperAdmin = session.user.role === "SUPER_ADMIN";
  const isSelf = session.user.id === userId;
  if (!isSuperAdmin && !isSelf) throw new Error("Access denied");

  const limit = 20;
  const skip = (page - 1) * limit;

  const [enquiries, total] = await Promise.all([
    prisma.enquiry.findMany({
      where: { assignedAgentId: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        status: true,
        source: true,
        priority: true,
        createdAt: true,
        interestedProperty: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.enquiry.count({ where: { assignedAgentId: userId } }),
  ]);

  return {
    enquiries,
    total,
    pages: Math.ceil(total / limit),
    currentPage: page,
  };
}

// =====================
// User Leads
// =====================

export async function getUserLeads(userId: string, page = 1) {
  const session = await requireAuth();
  const isSuperAdmin = session.user.role === "SUPER_ADMIN";
  const isSelf = session.user.id === userId;
  if (!isSuperAdmin && !isSelf) throw new Error("Access denied");

  const limit = 20;
  const skip = (page - 1) * limit;

  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      where: { ownerId: userId },
      select: {
        id: true,
        leadNumber: true,
        title: true,
        stage: true,
        estimatedValue: true,
        currency: true,
        source: true,
        priority: true,
        createdAt: true,
        client: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.lead.count({ where: { ownerId: userId } }),
  ]);

  return {
    leads,
    total,
    pages: Math.ceil(total / limit),
    currentPage: page,
  };
}

// =====================
// User Clients
// =====================

export async function getUserClients(userId: string, page = 1) {
  const session = await requireAuth();
  const isSuperAdmin = session.user.role === "SUPER_ADMIN";
  const isSelf = session.user.id === userId;
  if (!isSuperAdmin && !isSelf) throw new Error("Access denied");

  const limit = 20;
  const skip = (page - 1) * limit;

  const [clients, total] = await Promise.all([
    prisma.client.findMany({
      where: { assignedAgentId: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        nationality: true,
        status: true,
        source: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.client.count({ where: { assignedAgentId: userId } }),
  ]);

  return {
    clients,
    total,
    pages: Math.ceil(total / limit),
    currentPage: page,
  };
}

// =====================
// Chat Messages
// =====================

export async function getMessages(otherUserId: string) {
  const session = await requireAuth();
  const myId = session.user.id;

  const messages = await prisma.userMessage.findMany({
    where: {
      OR: [
        { senderId: myId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: myId },
      ],
    },
    select: {
      id: true,
      content: true,
      senderId: true,
      receiverId: true,
      isRead: true,
      createdAt: true,
      sender: { select: { firstName: true, lastName: true } },
    },
    orderBy: { createdAt: "asc" },
    take: 200,
  });

  // Mark unread messages as read
  await prisma.userMessage.updateMany({
    where: {
      senderId: otherUserId,
      receiverId: myId,
      isRead: false,
    },
    data: { isRead: true },
  });

  return messages;
}

export async function sendMessage(receiverId: string, content: string) {
  const session = await requireAuth();
  if (!content.trim()) throw new Error("Message cannot be empty");

  const message = await prisma.userMessage.create({
    data: {
      content: content.trim(),
      senderId: session.user.id,
      receiverId,
    },
    select: {
      id: true,
      content: true,
      senderId: true,
      receiverId: true,
      createdAt: true,
      sender: { select: { firstName: true, lastName: true } },
    },
  });

  // Notify the receiver
  const senderName = `${session.user.firstName} ${session.user.lastName}`;
  const senderSlug = toUserSlug(session.user.firstName, session.user.lastName);
  const preview = content.trim().length > 80
    ? content.trim().substring(0, 80) + "..."
    : content.trim();
  await notify(
    receiverId,
    "CHAT_MESSAGE",
    `New message from ${senderName}`,
    preview,
    `/users/${senderSlug}?tab=chat`,
  );

  return message;
}

// =====================
// Admin Notes
// =====================

export async function getUserNotes(userId: string) {
  await requireSuperAdmin();

  const notes = await prisma.userNote.findMany({
    where: { userId },
    select: {
      id: true,
      content: true,
      createdAt: true,
      updatedAt: true,
      author: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return notes;
}

export async function addUserNote(userId: string, content: string) {
  const session = await requireSuperAdmin();
  if (!content.trim()) throw new Error("Note cannot be empty");

  const note = await prisma.userNote.create({
    data: {
      content: content.trim(),
      userId,
      authorId: session.user.id,
    },
    select: {
      id: true,
      content: true,
      createdAt: true,
      author: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  // Notify the user about the admin note
  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { firstName: true, lastName: true },
  });
  if (targetUser) {
    const userSlug = toUserSlug(targetUser.firstName, targetUser.lastName);
    const preview = content.trim().length > 80
      ? content.trim().substring(0, 80) + "..."
      : content.trim();
    await notify(
      userId,
      "ADMIN_NOTE",
      "New note from admin",
      preview,
      `/users/${userSlug}?tab=notes`,
    );
  }

  revalidatePath(`/users`);
  return note;
}

export async function deleteUserNote(noteId: string) {
  await requireSuperAdmin();

  await prisma.userNote.delete({ where: { id: noteId } });

  revalidatePath(`/users`);
  return { success: true };
}
