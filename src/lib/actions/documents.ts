"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { auth, type ExtendedSession } from "@/lib/auth";
import type { DocumentCategory } from "@prisma/client";

// Get all documents with filtering
export async function getDocuments(params?: {
  category?: DocumentCategory;
  clientId?: string;
  applicationId?: string;
  page?: number;
  limit?: number;
}) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  const { category, clientId, applicationId, page = 1, limit = 25 } = params || {};
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};

  if (category) where.category = category;
  if (clientId) where.clientId = clientId;
  if (applicationId) where.applicationId = applicationId;

  // Role-based filtering
  if (session.user.role === "SALES_AGENT") {
    where.uploadedById = session.user.id;
  } else if (session.user.role !== "SUPER_ADMIN") {
    const officeAgents = await prisma.user.findMany({
      where: { office: session.user.office },
      select: { id: true },
    });
    where.uploadedById = { in: officeAgents.map((a) => a.id) };
  }

  const [documents, total] = await Promise.all([
    prisma.document.findMany({
      where,
      include: {
        client: { select: { id: true, firstName: true, lastName: true } },
        application: { select: { id: true, applicationNumber: true } },
        uploadedBy: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.document.count({ where }),
  ]);

  return { documents, total, pages: Math.ceil(total / limit), currentPage: page };
}

// Get documents by client
export async function getDocumentsByClient(clientId: string) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  return prisma.document.findMany({
    where: { clientId },
    include: {
      uploadedBy: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

// Get documents by citizenship application
export async function getDocumentsByApplication(applicationId: string) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  return prisma.document.findMany({
    where: { applicationId },
    include: {
      uploadedBy: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

// Get document stats
export async function getDocumentStats() {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  const baseWhere: Record<string, unknown> = {};

  if (session.user.role === "SALES_AGENT") {
    baseWhere.uploadedById = session.user.id;
  } else if (session.user.role !== "SUPER_ADMIN") {
    const officeAgents = await prisma.user.findMany({
      where: { office: session.user.office },
      select: { id: true },
    });
    baseWhere.uploadedById = { in: officeAgents.map((a) => a.id) };
  }

  const [total, byCategory] = await Promise.all([
    prisma.document.count({ where: baseWhere }),
    prisma.document.groupBy({
      by: ["category"],
      where: baseWhere,
      _count: { id: true },
    }),
  ]);

  return { total, byCategory };
}

// Create document record (file upload handled separately)
export async function createDocument(data: {
  name: string;
  fileUrl: string;
  fileType: string;
  category: DocumentCategory;
  clientId?: string;
  applicationId?: string;
}) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");
  if (session.user.role === "VIEWER") throw new Error("Unauthorized");

  const document = await prisma.document.create({
    data: {
      ...data,
      uploadedById: session.user.id,
    },
  });

  revalidatePath("/documents");
  if (data.clientId) revalidatePath(`/clients/${data.clientId}`);
  if (data.applicationId) revalidatePath(`/citizenship/${data.applicationId}`);

  return document;
}

// Delete document
export async function deleteDocument(id: string) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");
  if (!["SUPER_ADMIN", "ADMIN", "SALES_MANAGER"].includes(session.user.role)) {
    throw new Error("Unauthorized");
  }

  await prisma.document.delete({ where: { id } });

  revalidatePath("/documents");
}

// Get clients and applications for document upload form
export async function getDocumentFormData() {
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

  const [clients, applications] = await Promise.all([
    prisma.client.findMany({
      where: clientWhere,
      select: { id: true, firstName: true, lastName: true },
      orderBy: { firstName: "asc" },
    }),
    prisma.citizenshipApplication.findMany({
      where: {},
      select: {
        id: true,
        applicationNumber: true,
        client: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return { clients, applications };
}
