import { Suspense } from "react";
import { PerformanceDashboard } from "./performance-dashboard";

export default function AgentPerformancePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Agent Performance</h1>
        <p className="text-muted-foreground">
          Comprehensive performance statistics by sales agent
        </p>
      </div>
      <Suspense fallback={<div className="text-center py-12 text-muted-foreground">Loading performance data...</div>}>
        <PerformanceDashboardLoader />
      </Suspense>
    </div>
  );
}

async function PerformanceDashboardLoader() {
  // Import actions
  const { getAgentQueueStats, getAgentClientDistribution, getAgentActivityTimeline, getAgentNoteStats, getAgentSalesPerformance, getAgentDailyBreakdown } = await import("@/lib/actions/agent-performance");

  // Fetch all in parallel
  const [queueStats, clientDistribution, activityTimeline, noteStats, salesPerformance, dailyBreakdown] = await Promise.all([
    getAgentQueueStats(),
    getAgentClientDistribution(),
    getAgentActivityTimeline(),
    getAgentNoteStats(),
    getAgentSalesPerformance(),
    getAgentDailyBreakdown(),
  ]);

  // Extract agent names from activity timeline
  const agentNames = activityTimeline.length > 0
    ? Object.keys(activityTimeline[0]).filter(k => k !== "date")
    : [];

  // Calculate summary cards
  const totalAgents = new Set(salesPerformance.map(a => a.agentId)).size;
  const totalClients = clientDistribution.reduce((sum, a) => sum + a.count, 0);
  const avgPerAgent = totalAgents > 0 ? Math.round(totalClients / totalAgents) : 0;
  const topPerformer = salesPerformance.length > 0
    ? salesPerformance.reduce((best, a) => a.totalRevenue > best.totalRevenue ? a : best)
    : null;

  // Calculate today's date range for default
  const today = new Date().toISOString().split("T")[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  return (
    <PerformanceDashboard
      initialData={{
        queueStats,
        clientDistribution,
        activityTimeline,
        noteStats,
        salesPerformance,
        dailyBreakdown,
        agentNames,
        summary: { totalAgents, totalClients, avgPerAgent, topPerformerName: topPerformer?.agentName || "N/A", topPerformerRevenue: topPerformer?.totalRevenue || 0 },
        defaults: { today, thirtyDaysAgo },
      }}
    />
  );
}
