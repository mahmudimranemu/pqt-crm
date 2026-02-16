"use server";

import { prisma } from "@/lib/prisma";

export type RoutingStrategy = "ROUND_ROBIN" | "TERRITORY" | "CAPACITY";

/**
 * Get the next available agent for assignment based on routing strategy.
 */
export async function getNextAgent(
  strategy: RoutingStrategy = "ROUND_ROBIN",
  metadata?: { country?: string | null }
): Promise<string | null> {
  // Get all active sales agents
  const agents = await prisma.user.findMany({
    where: {
      role: { in: ["SALES_AGENT", "SALES_MANAGER"] },
      isActive: true,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      office: true,
      _count: {
        select: {
          ownedLeads: { where: { stage: { notIn: ["WON", "LOST"] } } },
          enquiries: {
            where: { status: { in: ["NEW", "ASSIGNED", "CONTACTED"] } },
          },
        },
      },
    },
  });

  if (agents.length === 0) return null;

  switch (strategy) {
    case "ROUND_ROBIN": {
      // Find agent who was least recently assigned
      const lastAssignment = await prisma.enquiry.findFirst({
        where: { assignedAgentId: { not: null } },
        orderBy: { updatedAt: "desc" },
        select: { assignedAgentId: true },
      });

      const lastIndex = lastAssignment
        ? agents.findIndex((a) => a.id === lastAssignment.assignedAgentId)
        : -1;
      const nextIndex = (lastIndex + 1) % agents.length;
      return agents[nextIndex].id;
    }

    case "TERRITORY": {
      // Match agent by office/territory based on enquiry country
      if (metadata?.country) {
        const countryLower = metadata.country.toLowerCase();
        const matchedAgent = agents.find((a) =>
          a.office?.toLowerCase().includes(countryLower)
        );
        if (matchedAgent) return matchedAgent.id;
      }
      // Fallback to round robin
      return getNextAgent("ROUND_ROBIN");
    }

    case "CAPACITY": {
      // Assign to agent with fewest open leads + enquiries
      const sorted = agents.sort((a, b) => {
        const aLoad =
          (a._count.ownedLeads || 0) + (a._count.enquiries || 0);
        const bLoad =
          (b._count.ownedLeads || 0) + (b._count.enquiries || 0);
        return aLoad - bLoad;
      });
      return sorted[0].id;
    }

    default:
      return agents[0].id;
  }
}

/**
 * Auto-assign an enquiry to the next available agent.
 */
export async function autoAssignEnquiry(
  enquiryId: string,
  country?: string | null
): Promise<string | null> {
  const agentId = await getNextAgent("CAPACITY", { country });

  if (agentId) {
    await prisma.enquiry.update({
      where: { id: enquiryId },
      data: {
        assignedAgentId: agentId,
        status: "ASSIGNED",
      },
    });
  }

  return agentId;
}
