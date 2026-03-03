"use server";

import prisma from "@/lib/prisma";
import { auth, type ExtendedSession } from "@/lib/auth";

export type PropertyCrmCounts = Record<
  string,
  { enquiryCount: number; leadCount: number }
>;

export async function getBulkPropertyCrmCounts(): Promise<PropertyCrmCounts> {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) return {};

  const [enquiries, leads] = await Promise.all([
    prisma.enquiry.findMany({
      where: { interestedPropertyRefs: { isEmpty: false } },
      select: { interestedPropertyRefs: true },
    }),
    prisma.lead.findMany({
      where: { interestedPropertyRefs: { isEmpty: false } },
      select: { interestedPropertyRefs: true },
    }),
  ]);

  const counts: PropertyCrmCounts = {};

  for (const e of enquiries) {
    for (const ref of e.interestedPropertyRefs) {
      if (!counts[ref]) counts[ref] = { enquiryCount: 0, leadCount: 0 };
      counts[ref].enquiryCount++;
    }
  }

  for (const l of leads) {
    for (const ref of l.interestedPropertyRefs) {
      if (!counts[ref]) counts[ref] = { enquiryCount: 0, leadCount: 0 };
      counts[ref].leadCount++;
    }
  }

  return counts;
}

export type PropertyCrmData = {
  enquiryCount: number;
  leadCount: number;
  clientCount: number;
  activity: {
    consultantId: string;
    consultantName: string;
    entityType: "enquiry" | "lead";
    entityId: string;
    entityLabel: string;
    entityLink: string;
  }[];
};

export async function getPropertyCrmData(
  externalPropertyId: string,
): Promise<PropertyCrmData> {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  // Find enquiries linked to this external property
  const enquiries = await prisma.enquiry.findMany({
    where: { interestedPropertyRefs: { has: externalPropertyId } },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      assignedAgent: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  });

  // Find leads linked to this external property
  const leads = await prisma.lead.findMany({
    where: { interestedPropertyRefs: { has: externalPropertyId } },
    select: {
      id: true,
      title: true,
      leadNumber: true,
      clientId: true,
      owner: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  // Unique clients from both enquiries (via conversion) and leads
  const clientIds = new Set<string>();
  for (const lead of leads) {
    clientIds.add(lead.clientId);
  }

  // Build activity list
  const activity: PropertyCrmData["activity"] = [];

  for (const e of enquiries) {
    if (e.assignedAgent) {
      activity.push({
        consultantId: e.assignedAgent.id,
        consultantName: `${e.assignedAgent.firstName} ${e.assignedAgent.lastName}`,
        entityType: "enquiry",
        entityId: e.id,
        entityLabel: `${e.firstName} ${e.lastName}`,
        entityLink: `/clients/enquiries/${e.id}`,
      });
    }
  }

  for (const l of leads) {
    activity.push({
      consultantId: l.owner.id,
      consultantName: `${l.owner.firstName} ${l.owner.lastName}`,
      entityType: "lead",
      entityId: l.id,
      entityLabel: l.leadNumber || l.title,
      entityLink: `/leads/${l.id}`,
    });
  }

  return {
    enquiryCount: enquiries.length,
    leadCount: leads.length,
    clientCount: clientIds.size,
    activity,
  };
}
