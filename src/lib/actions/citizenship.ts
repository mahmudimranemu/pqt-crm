"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { auth, type ExtendedSession } from "@/lib/auth";
import type { CitizenshipStage, MilestoneStatus, Relationship, FamilyMemberStatus } from "@prisma/client";

// Get all citizenship applications
export async function getCitizenshipApplications(params?: {
  stage?: CitizenshipStage;
  page?: number;
  limit?: number;
}) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  const { stage, page = 1, limit = 25 } = params || {};
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (stage) where.stage = stage;

  // Role-based filtering through sale's agent
  if (session.user.role === "SALES_AGENT") {
    where.sale = { agentId: session.user.id };
  } else if (session.user.role !== "SUPER_ADMIN") {
    const officeAgents = await prisma.user.findMany({
      where: { office: session.user.office },
      select: { id: true },
    });
    where.sale = { agentId: { in: officeAgents.map((a) => a.id) } };
  }

  const [applications, total] = await Promise.all([
    prisma.citizenshipApplication.findMany({
      where,
      include: {
        client: { select: { id: true, firstName: true, lastName: true, nationality: true } },
        sale: {
          select: {
            id: true,
            salePrice: true,
            property: { select: { id: true, name: true } },
            agent: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        milestones: { orderBy: { createdAt: "desc" }, take: 1 },
        familyMembers: { select: { id: true } },
      },
      orderBy: { updatedAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.citizenshipApplication.count({ where }),
  ]);

  return { applications, total, pages: Math.ceil(total / limit), currentPage: page };
}

// Get single citizenship application
export async function getCitizenshipById(id: string) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  const application = await prisma.citizenshipApplication.findUnique({
    where: { id },
    include: {
      client: true,
      sale: {
        include: {
          property: true,
          agent: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      },
      milestones: { orderBy: { createdAt: "asc" } },
      familyMembers: true,
      documents: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!application) throw new Error("Application not found");

  return application;
}

// Get stats
export async function getCitizenshipStats() {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  const baseWhere: Record<string, unknown> = {};

  if (session.user.role === "SALES_AGENT") {
    baseWhere.sale = { agentId: session.user.id };
  } else if (session.user.role !== "SUPER_ADMIN") {
    const officeAgents = await prisma.user.findMany({
      where: { office: session.user.office },
      select: { id: true },
    });
    baseWhere.sale = { agentId: { in: officeAgents.map((a) => a.id) } };
  }

  const [total, inProgress, approved, passportIssued, byStage] = await Promise.all([
    prisma.citizenshipApplication.count({ where: baseWhere }),
    prisma.citizenshipApplication.count({
      where: {
        ...baseWhere,
        stage: {
          notIn: ["APPROVED", "PASSPORT_ISSUED", "REJECTED"],
        },
      },
    }),
    prisma.citizenshipApplication.count({
      where: { ...baseWhere, stage: "APPROVED" },
    }),
    prisma.citizenshipApplication.count({
      where: { ...baseWhere, stage: "PASSPORT_ISSUED" },
    }),
    prisma.citizenshipApplication.groupBy({
      by: ["stage"],
      where: baseWhere,
      _count: { id: true },
    }),
  ]);

  return { total, inProgress, approved, passportIssued, byStage };
}

// Create citizenship application
export async function createCitizenshipApplication(data: {
  saleId: string;
  clientId: string;
  applicationNumber?: string;
  estimatedCompletionDate?: Date;
  notes?: string;
}) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");
  if (session.user.role === "VIEWER") throw new Error("Unauthorized");

  // Check if sale is citizenship eligible
  const sale = await prisma.sale.findUnique({
    where: { id: data.saleId },
    select: { citizenshipEligible: true },
  });

  if (!sale?.citizenshipEligible) {
    throw new Error("This sale is not eligible for citizenship application");
  }

  // Check if application already exists
  const existing = await prisma.citizenshipApplication.findUnique({
    where: { saleId: data.saleId },
  });

  if (existing) {
    throw new Error("A citizenship application already exists for this sale");
  }

  const application = await prisma.citizenshipApplication.create({
    data: {
      saleId: data.saleId,
      clientId: data.clientId,
      applicationNumber: data.applicationNumber,
      estimatedCompletionDate: data.estimatedCompletionDate,
      notes: data.notes,
    },
  });

  // Create initial milestones
  const defaultMilestones = [
    "Document Collection",
    "Property Valuation Certificate",
    "Application Filing",
    "Biometrics Appointment",
    "Government Review",
    "Final Approval",
    "Passport Issuance",
  ];

  await prisma.citizenshipMilestone.createMany({
    data: defaultMilestones.map((milestone) => ({
      applicationId: application.id,
      milestone,
      status: "PENDING" as MilestoneStatus,
    })),
  });

  revalidatePath("/citizenship");
  return application;
}

// Update application stage
export async function updateCitizenshipStage(id: string, stage: CitizenshipStage) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");
  if (session.user.role === "VIEWER") throw new Error("Unauthorized");

  const application = await prisma.citizenshipApplication.update({
    where: { id },
    data: {
      stage,
      ...(stage === "PASSPORT_ISSUED" ? { actualCompletionDate: new Date() } : {}),
    },
  });

  revalidatePath("/citizenship");
  revalidatePath(`/citizenship/${id}`);
  return application;
}

// Update milestone
export async function updateMilestone(
  id: string,
  data: { status?: MilestoneStatus; completedDate?: Date; notes?: string }
) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");
  if (session.user.role === "VIEWER") throw new Error("Unauthorized");

  const milestone = await prisma.citizenshipMilestone.update({
    where: { id },
    data: {
      ...data,
      completedDate: data.status === "COMPLETED" ? data.completedDate || new Date() : data.completedDate,
    },
  });

  revalidatePath("/citizenship");
  return milestone;
}

// Add family member
export async function addFamilyMember(data: {
  applicationId: string;
  firstName: string;
  lastName: string;
  relationship: Relationship;
  dateOfBirth?: Date;
  passportNumber?: string;
}) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");
  if (session.user.role === "VIEWER") throw new Error("Unauthorized");

  const member = await prisma.familyMember.create({ data });

  revalidatePath(`/citizenship/${data.applicationId}`);
  return member;
}

// Update family member status
export async function updateFamilyMemberStatus(id: string, status: FamilyMemberStatus) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");
  if (session.user.role === "VIEWER") throw new Error("Unauthorized");

  const member = await prisma.familyMember.update({
    where: { id },
    data: { status },
  });

  revalidatePath("/citizenship");
  return member;
}

// Get eligible sales for new applications
export async function getEligibleSalesForCitizenship() {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  const where: Record<string, unknown> = {
    citizenshipEligible: true,
    citizenshipApplication: null, // No application yet
  };

  if (session.user.role === "SALES_AGENT") {
    where.agentId = session.user.id;
  } else if (session.user.role !== "SUPER_ADMIN") {
    const officeAgents = await prisma.user.findMany({
      where: { office: session.user.office },
      select: { id: true },
    });
    where.agentId = { in: officeAgents.map((a) => a.id) };
  }

  return prisma.sale.findMany({
    where,
    include: {
      client: { select: { id: true, firstName: true, lastName: true } },
      property: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}
