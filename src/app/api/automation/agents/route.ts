import prisma from "@/lib/prisma";
import { OPEN_LEAD_WHERE, qualifierUserWhere } from "@/lib/qualifier/data";
import { automationRoute } from "@/lib/qualifier/route";

export const dynamic = "force-dynamic";

/**
 * GET /api/automation/agents
 * Everyone the qualifier may suggest, with their profile, time off, current
 * workload and latest daily digest. No emails, phones or passwords.
 * Telegram chat ids are included for senior consultants only (they receive
 * the alerts).
 */
export const GET = automationRoute(async () => {
  const now = new Date();
  const users = await prisma.user.findMany({
    where: qualifierUserWhere(),
    orderBy: { firstName: "asc" },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      role: true,
      office: true,
      agentProfile: true,
      agentTimeOff: {
        where: { endsAt: { gte: now } },
        orderBy: { startsAt: "asc" },
        select: { startsAt: true, endsAt: true },
      },
      agentDailyDigests: { orderBy: { date: "desc" }, take: 1 },
    },
  });
  const ids = users.map((u) => u.id);

  const [openLeads, openEnquiries] = await Promise.all([
    prisma.lead.groupBy({
      by: ["ownerId"],
      where: { ...OPEN_LEAD_WHERE, ownerId: { in: ids } },
      _count: { _all: true },
    }),
    prisma.enquiry.groupBy({
      by: ["assignedAgentId"],
      where: { status: { in: ["ASSIGNED", "CONTACTED"] }, assignedAgentId: { in: ids } },
      _count: { _all: true },
    }),
  ]);
  const leadCount = new Map(openLeads.map((r) => [r.ownerId, r._count._all]));
  const enqCount = new Map(openEnquiries.map((r) => [r.assignedAgentId, r._count._all]));

  const agents = users.map((u) => {
    const p = u.agentProfile;
    const digest = u.agentDailyDigests[0] ?? null;
    return {
      id: u.id,
      name: `${u.firstName} ${u.lastName}`.trim(),
      role: u.role,
      office: u.office,
      hasProfile: !!p,
      languages: p?.languages ?? [],
      strongCountries: p?.strongCountries ?? [],
      specialties: p?.specialties ?? [],
      timezone: p?.timezone ?? null,
      weeklySchedule: p?.weeklySchedule ?? null,
      isAvailable: p?.isAvailable ?? false,
      isSeniorConsultant: p?.isSeniorConsultant ?? false,
      telegramChatId: p?.isSeniorConsultant ? p.telegramChatId : null,
      maxOpenLeads: p?.maxOpenLeads ?? null,
      onTimeOffNow: u.agentTimeOff.some((t) => t.startsAt <= now && t.endsAt > now),
      timeOff: u.agentTimeOff,
      openLeadCount: leadCount.get(u.id) ?? 0,
      openEnquiryCount: enqCount.get(u.id) ?? 0,
      latestDigest: digest && {
        date: digest.date.toISOString().slice(0, 10),
        callsLogged: digest.callsLogged,
        notesLogged: digest.notesLogged,
        tasksCompleted: digest.tasksCompleted,
        inquiriesHandled: digest.inquiriesHandled,
        leadsConverted: digest.leadsConverted,
        dealsWon: digest.dealsWon,
        dealsLost: digest.dealsLost,
        avgFirstResponseMinutes: digest.avgFirstResponseMinutes,
        openLeadCount: digest.openLeadCount,
        rollingStats: digest.rollingStats,
        lowData: digest.lowData,
        aiSummary: digest.aiSummary,
      },
    };
  });

  return { status: 200, body: { count: agents.length, agents }, audit: { summary: { returned: agents.length } } };
});
