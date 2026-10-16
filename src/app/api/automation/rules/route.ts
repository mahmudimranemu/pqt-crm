import prisma from "@/lib/prisma";
import { automationRoute, fail } from "@/lib/qualifier/route";

export const dynamic = "force-dynamic";

/** GET /api/automation/rules — the active scoring rules version. */
export const GET = automationRoute(async () => {
  const active = await prisma.qualifierRules.findFirst({
    where: { isActive: true },
    select: { version: true, rules: true, note: true, createdAt: true },
  });
  if (!active) return fail(404, "NO_ACTIVE_RULES", "No active rules version");
  return { status: 200, body: active, audit: { summary: { version: active.version } } };
});
