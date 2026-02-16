"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { auth, type ExtendedSession } from "@/lib/auth";
import type { Prisma } from "@prisma/client";

export async function getAutomationRules() {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");
  if (!["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) {
    throw new Error("Unauthorized - Admin access required");
  }

  return prisma.automationRule.findMany({
    orderBy: { createdAt: "desc" },
  });
}

export async function getAutomationRule(id: string) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  return prisma.automationRule.findUnique({ where: { id } });
}

export async function createAutomationRule(data: {
  name: string;
  triggerEvent: string;
  conditions: Prisma.InputJsonValue;
  actions: Prisma.InputJsonValue;
}) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");
  if (!["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) {
    throw new Error("Unauthorized - Admin access required");
  }

  const rule = await prisma.automationRule.create({
    data: {
      ...data,
      createdBy: session.user.id,
    },
  });

  revalidatePath("/settings/automation");
  return rule;
}

export async function updateAutomationRule(
  id: string,
  data: {
    name?: string;
    triggerEvent?: string;
    conditions?: Prisma.InputJsonValue;
    actions?: Prisma.InputJsonValue;
    isActive?: boolean;
  },
) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");
  if (!["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) {
    throw new Error("Unauthorized - Admin access required");
  }

  const rule = await prisma.automationRule.update({
    where: { id },
    data,
  });

  revalidatePath("/settings/automation");
  return rule;
}

export async function deleteAutomationRule(id: string) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");
  if (!["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) {
    throw new Error("Unauthorized - Admin access required");
  }

  await prisma.automationRule.delete({ where: { id } });

  revalidatePath("/settings/automation");
  return { success: true };
}

export async function toggleAutomationRule(id: string) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");
  if (!["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) {
    throw new Error("Unauthorized - Admin access required");
  }

  const rule = await prisma.automationRule.findUnique({ where: { id } });
  if (!rule) throw new Error("Rule not found");

  const updated = await prisma.automationRule.update({
    where: { id },
    data: { isActive: !rule.isActive },
  });

  revalidatePath("/settings/automation");
  return updated;
}
