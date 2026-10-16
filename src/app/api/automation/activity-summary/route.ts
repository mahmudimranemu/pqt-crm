import { istanbulDayRange } from "@/lib/qualifier/config";
import { activitySummary } from "@/lib/qualifier/data";
import { automationRoute, fail } from "@/lib/qualifier/route";

export const dynamic = "force-dynamic";

/**
 * GET /api/automation/activity-summary?date=YYYY-MM-DD
 * Per-agent activity counts for that day (Istanbul time). Counts only.
 * openLeadCountNow is as of the moment of the call, not the end of the day.
 */
export const GET = automationRoute(async ({ url }) => {
  const date = url.searchParams.get("date") ?? "";
  const range = istanbulDayRange(date);
  if (!range) return fail(422, "VALIDATION_FAILED", "date must be a real day as YYYY-MM-DD");

  const agents = await activitySummary(range.start, range.end);
  return {
    status: 200,
    body: {
      date,
      timezone: "Europe/Istanbul",
      from: range.start.toISOString(),
      to: range.end.toISOString(),
      agents,
    },
    audit: { summary: { date, agents: agents.length } },
  };
});
