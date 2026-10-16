import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { digestInput } from "@/lib/qualifier/schemas";
import { automationRoute, fail, validate } from "@/lib/qualifier/route";

export const dynamic = "force-dynamic";

/**
 * POST /api/automation/digests  { digests: [...] }
 * Saves daily digests. Idempotent per agent per date: sending the same day
 * again updates that row instead of adding another.
 */
export const POST = automationRoute(async ({ body }) => {
  const v = validate(digestInput, body);
  if (!v.ok) return v.result;
  const { digests } = v.data;

  const keys = new Set(digests.map((d) => `${d.userId}|${d.date}`));
  if (keys.size !== digests.length) {
    return fail(422, "DUPLICATE_ROWS", "The same agent and date appear more than once");
  }
  const userIds = [...new Set(digests.map((d) => d.userId))];
  const found = await prisma.user.count({ where: { id: { in: userIds } } });
  if (found !== userIds.length) return fail(422, "UNKNOWN_USER", "One or more userIds don't exist");

  await prisma.$transaction(
    digests.map((d) => {
      const date = new Date(`${d.date}T00:00:00Z`);
      const data = {
        callsLogged: d.callsLogged,
        notesLogged: d.notesLogged,
        tasksCompleted: d.tasksCompleted,
        inquiriesHandled: d.inquiriesHandled,
        leadsConverted: d.leadsConverted,
        dealsWon: d.dealsWon,
        dealsLost: d.dealsLost,
        avgFirstResponseMinutes: d.avgFirstResponseMinutes ?? null,
        openLeadCount: d.openLeadCount,
        rollingStats: (d.rollingStats as Prisma.InputJsonValue | undefined) ?? Prisma.DbNull,
        lowData: d.lowData,
        aiSummary: d.aiSummary ?? null,
      };
      return prisma.agentDailyDigest.upsert({
        where: { userId_date: { userId: d.userId, date } },
        create: { userId: d.userId, date, ...data },
        update: data,
      });
    }),
  );

  return { status: 200, body: { saved: digests.length }, audit: { summary: { saved: digests.length } } };
});
