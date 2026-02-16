import { prisma } from "@/lib/prisma";

/**
 * Lead scoring algorithm - scores leads 0-100 based on engagement and qualification signals.
 */
export async function updateLeadScore(leadId: string): Promise<number> {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      client: true,
      _count: { select: { activities: true, tasks: true } },
    },
  });

  if (!lead) return 0;

  let score = 0;

  // Budget indicator (+20)
  if (lead.estimatedValue && Number(lead.estimatedValue) > 0) score += 20;

  // Source quality (+10 for referrals)
  if (lead.source === "REFERRAL") score += 10;

  // Client engagement
  if (lead.client) {
    // Spoken to client (+10)
    const enquiry = await prisma.enquiry.findFirst({
      where: { email: lead.client.email, spoken: true },
    });
    if (enquiry) score += 10;

    // Called client (+5)
    const calledEnquiry = await prisma.enquiry.findFirst({
      where: { email: lead.client.email, called: true },
    });
    if (calledEnquiry) score += 5;
  }

  // Recent activity (+10 if activity in last 7 days)
  if (lead._count.activities > 0) {
    const recentActivity = await prisma.activity.findFirst({
      where: {
        leadId,
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    });
    if (recentActivity) score += 10;
  }

  // Has tasks (+5)
  if (lead._count.tasks > 0) score += 5;

  // Stage progression bonus
  const stageScores: Record<string, number> = {
    NEW_ENQUIRY: 0,
    CONTACTED: 5,
    QUALIFIED: 15,
    VIEWING_ARRANGED: 20,
    VIEWED: 25,
    OFFER_MADE: 30,
    NEGOTIATING: 35,
    WON: 40,
  };
  score += stageScores[lead.stage] ?? 0;

  // Cap at 100
  score = Math.min(score, 100);

  // Update the lead
  await prisma.lead.update({
    where: { id: leadId },
    data: { score },
  });

  return score;
}

/**
 * Get SLA deadline based on priority level.
 */
export function getSlaDeadline(priority: string | null): Date {
  const now = new Date();
  const hours: Record<string, number> = {
    URGENT: 4,
    HIGH: 24,
    MEDIUM: 48,
    LOW: 72,
  };
  const hoursToAdd = hours[priority ?? "MEDIUM"] ?? 48;
  return new Date(now.getTime() + hoursToAdd * 60 * 60 * 1000);
}
