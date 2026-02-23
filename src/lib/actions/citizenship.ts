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
        milestones: { orderBy: { createdAt: "asc" } },
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

  // Create initial milestones (12-step Turkish citizenship by investment process)
  const defaultMilestones = [
    "Client Onboarding & KYC",
    "Property Selection & Reservation",
    "Property Valuation",
    "Title Deed (TAPU) Transfer",
    "Conformity Certificate",
    "Document Collection & Preparation",
    "Residence Permit Application",
    "Citizenship Application Submission",
    "Security & Background Check",
    "Ministry Review & Approval",
    "Citizenship Granted",
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

// Toggle milestone completion (for the step-by-step checklist)
export async function toggleMilestoneCompletion(
  milestoneId: string,
  completed: boolean,
  completedDate?: string
) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");
  if (session.user.role === "VIEWER") throw new Error("Unauthorized");

  const milestone = await prisma.citizenshipMilestone.update({
    where: { id: milestoneId },
    data: {
      status: completed ? "COMPLETED" : "PENDING",
      completedDate: completed
        ? completedDate
          ? new Date(completedDate)
          : new Date()
        : null,
    },
  });

  // Update the parent application's stage based on completed milestones
  const allMilestones = await prisma.citizenshipMilestone.findMany({
    where: { applicationId: milestone.applicationId },
    orderBy: { createdAt: "asc" },
  });

  // Map milestone names to CitizenshipStage enum values
  const milestoneToStage: Record<string, CitizenshipStage> = {
    "Client Onboarding & KYC": "DOCUMENT_COLLECTION",
    "Property Selection & Reservation": "DOCUMENT_COLLECTION",
    "Property Valuation": "PROPERTY_VALUATION",
    "Title Deed (TAPU) Transfer": "PROPERTY_VALUATION",
    "Conformity Certificate": "APPLICATION_FILED",
    "Document Collection & Preparation": "APPLICATION_FILED",
    "Residence Permit Application": "BIOMETRICS_SCHEDULED",
    "Citizenship Application Submission": "BIOMETRICS_COMPLETED",
    "Security & Background Check": "UNDER_REVIEW",
    "Ministry Review & Approval": "INTERVIEW_COMPLETED",
    "Citizenship Granted": "APPROVED",
    "Passport Issuance": "PASSPORT_ISSUED",
  };

  // Find the highest completed milestone
  let highestStage: CitizenshipStage = "DOCUMENT_COLLECTION";
  for (const m of allMilestones) {
    if (m.status === "COMPLETED" && milestoneToStage[m.milestone]) {
      highestStage = milestoneToStage[m.milestone];
    }
  }

  const allCompleted = allMilestones.every((m) => m.status === "COMPLETED");

  await prisma.citizenshipApplication.update({
    where: { id: milestone.applicationId },
    data: {
      stage: highestStage,
      ...(allCompleted ? { actualCompletionDate: new Date() } : { actualCompletionDate: null }),
    },
  });

  revalidatePath("/citizenship");
  revalidatePath(`/citizenship/${milestone.applicationId}`);
  return milestone;
}

// Update milestone completion date only
export async function updateMilestoneDate(milestoneId: string, completedDate: string) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");
  if (session.user.role === "VIEWER") throw new Error("Unauthorized");

  const milestone = await prisma.citizenshipMilestone.update({
    where: { id: milestoneId },
    data: {
      completedDate: new Date(completedDate),
    },
  });

  revalidatePath("/citizenship");
  revalidatePath(`/citizenship/${milestone.applicationId}`);
  return milestone;
}

// Initialize 12-step milestones for existing applications that have old milestones
export async function reinitializeMilestones(applicationId: string) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");
  if (session.user.role === "VIEWER") throw new Error("Unauthorized");

  const newMilestoneNames = [
    "Client Onboarding & KYC",
    "Property Selection & Reservation",
    "Property Valuation",
    "Title Deed (TAPU) Transfer",
    "Conformity Certificate",
    "Document Collection & Preparation",
    "Residence Permit Application",
    "Citizenship Application Submission",
    "Security & Background Check",
    "Ministry Review & Approval",
    "Citizenship Granted",
    "Passport Issuance",
  ];

  // Check existing milestones
  const existing = await prisma.citizenshipMilestone.findMany({
    where: { applicationId },
    orderBy: { createdAt: "asc" },
  });

  const existingNames = existing.map((m) => m.milestone);
  const hasNewFormat = newMilestoneNames.some((name) => existingNames.includes(name));

  // Only reinitialize if the milestones are in the old format
  if (!hasNewFormat) {
    // Delete old milestones
    await prisma.citizenshipMilestone.deleteMany({
      where: { applicationId },
    });

    // Create new milestones
    await prisma.citizenshipMilestone.createMany({
      data: newMilestoneNames.map((milestone) => ({
        applicationId,
        milestone,
        status: "PENDING" as MilestoneStatus,
      })),
    });
  }

  revalidatePath("/citizenship");
  revalidatePath(`/citizenship/${applicationId}`);
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
