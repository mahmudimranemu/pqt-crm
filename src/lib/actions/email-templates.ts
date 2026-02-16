"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { auth, type ExtendedSession } from "@/lib/auth";

export async function getEmailTemplates() {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  return prisma.emailTemplate.findMany({
    orderBy: { createdAt: "desc" },
  });
}

export async function getEmailTemplate(id: string) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  return prisma.emailTemplate.findUnique({ where: { id } });
}

export async function createEmailTemplate(data: {
  name: string;
  subject: string;
  bodyHtml: string;
  category: string;
  variables?: string[];
}) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");
  if (!["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) {
    throw new Error("Unauthorized - Admin access required");
  }

  const template = await prisma.emailTemplate.create({
    data: {
      ...data,
      variables: data.variables ?? [],
      createdBy: session.user.id,
    },
  });

  revalidatePath("/settings/email-templates");
  return template;
}

export async function updateEmailTemplate(
  id: string,
  data: {
    name?: string;
    subject?: string;
    bodyHtml?: string;
    category?: string;
    variables?: string[];
    isActive?: boolean;
  },
) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");
  if (!["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) {
    throw new Error("Unauthorized - Admin access required");
  }

  const template = await prisma.emailTemplate.update({
    where: { id },
    data,
  });

  revalidatePath("/settings/email-templates");
  return template;
}

export async function deleteEmailTemplate(id: string) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");
  if (!["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) {
    throw new Error("Unauthorized - Admin access required");
  }

  await prisma.emailTemplate.delete({ where: { id } });

  revalidatePath("/settings/email-templates");
  return { success: true };
}
