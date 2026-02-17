"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserCheck, BarChart3, Trophy } from "lucide-react";
import {
  ClientQueueChart,
  ClientDistributionChart,
  AgentActivityChart,
  AgentNotesChart,
  SalesPerformanceTable,
  DailyBreakdownTable,
} from "./performance-charts";
// Import the server actions for refetching
import { getAgentActivityTimeline, getAgentNoteStats, getAgentSalesPerformance, getAgentDailyBreakdown } from "@/lib/actions/agent-performance";

interface PerformanceDashboardProps {
  initialData: {
    queueStats: { agentName: string; todayCalls: number; previousCalls: number; futureCalls: number; newLeads: number }[];
    clientDistribution: { agentName: string; count: number; percentage: number }[];
    activityTimeline: Record<string, any>[];
    noteStats: { agentName: string; notesCount: number; enquiryNotes: number; leadNotes: number; activityNotes: number }[];
    salesPerformance: { agentName: string; agentId: string; totalSales: number; totalRevenue: number; totalBookings: number; totalCalls: number; totalLeads: number; totalDeals: number; wonDeals: number; conversionRate: number }[];
    dailyBreakdown: { agentName: string; agentId: string; calls: number; emails: number; meetings: number; notes: number; newEnquiries: number; newLeads: number }[];
    agentNames: string[];
    summary: {
      totalAgents: number;
      totalClients: number;
      avgPerAgent: number;
      topPerformerName: string;
      topPerformerRevenue: number;
    };
    defaults: {
      today: string;
      thirtyDaysAgo: string;
    };
  };
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function PerformanceDashboard({ initialData }: PerformanceDashboardProps) {
  const [isPending, startTransition] = useTransition();

  // Activity timeline state
  const [activityData, setActivityData] = useState(initialData.activityTimeline);
  const [agentNames, setAgentNames] = useState(initialData.agentNames);
  const [dateRange, setDateRange] = useState({
    from: initialData.defaults.thirtyDaysAgo,
    to: initialData.defaults.today,
  });

  // Notes state
  const [noteStats, setNoteStats] = useState(initialData.noteStats);
  const [notesPeriod, setNotesPeriod] = useState("month");

  // Sales state
  const [salesData, setSalesData] = useState(initialData.salesPerformance);
  const [salesPeriod, setSalesPeriod] = useState("month");

  // Daily breakdown state
  const [dailyData, setDailyData] = useState(initialData.dailyBreakdown);
  const [dailyDate, setDailyDate] = useState(initialData.defaults.today);

  const handleDateRangeChange = (from: string, to: string) => {
    setDateRange({ from, to });
    startTransition(async () => {
      const data = await getAgentActivityTimeline(from, to);
      setActivityData(data);
      const names = data.length > 0 ? Object.keys(data[0]).filter(k => k !== "date") : [];
      setAgentNames(names);
    });
  };

  const handleNotesPeriodChange = (period: string) => {
    setNotesPeriod(period);
    startTransition(async () => {
      const data = await getAgentNoteStats(period as "week" | "month" | "quarter");
      setNoteStats(data);
    });
  };

  const handleSalesPeriodChange = (period: string) => {
    setSalesPeriod(period);
    startTransition(async () => {
      const data = await getAgentSalesPerformance(period as "week" | "month" | "quarter" | "year");
      setSalesData(data);
    });
  };

  const handleDailyDateChange = (date: string) => {
    setDailyDate(date);
    startTransition(async () => {
      const data = await getAgentDailyBreakdown(date);
      setDailyData(data);
    });
  };

  const { summary } = initialData;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Agents</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{summary.totalAgents}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{summary.totalClients}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Per Agent</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{summary.avgPerAgent}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Performer</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-gray-900">{summary.topPerformerName}</div>
            <p className="text-xs text-muted-foreground">{formatCurrency(summary.topPerformerRevenue)} revenue</p>
          </CardContent>
        </Card>
      </div>

      {/* Loading overlay */}
      {isPending && (
        <div className="text-center py-2 text-sm text-muted-foreground animate-pulse">
          Updating data...
        </div>
      )}

      {/* Row 1: Queue Stats + Client Distribution */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">Total Clients by Queue</CardTitle>
            <p className="text-sm text-muted-foreground">Client call queue distribution per agent</p>
          </CardHeader>
          <CardContent>
            <ClientQueueChart data={initialData.queueStats} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">Client Distribution</CardTitle>
            <p className="text-sm text-muted-foreground">Percentage of clients per sales agent</p>
          </CardHeader>
          <CardContent>
            <ClientDistributionChart data={initialData.clientDistribution} />
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Activity Timeline (full width) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">Agent Activity Timeline</CardTitle>
          <p className="text-sm text-muted-foreground">Daily activity trends per agent over time</p>
        </CardHeader>
        <CardContent>
          <AgentActivityChart
            data={activityData}
            agentNames={agentNames}
            dateRange={dateRange}
            onDateRangeChange={handleDateRangeChange}
          />
        </CardContent>
      </Card>

      {/* Row 3: Notes + Sales Performance */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">Notes by Agent</CardTitle>
            <p className="text-sm text-muted-foreground">Notes written per agent by category</p>
          </CardHeader>
          <CardContent>
            <AgentNotesChart
              data={noteStats}
              period={notesPeriod}
              onPeriodChange={handleNotesPeriodChange}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">Sales Performance</CardTitle>
            <p className="text-sm text-muted-foreground">Comprehensive sales metrics per agent</p>
          </CardHeader>
          <CardContent>
            <SalesPerformanceTable
              data={salesData}
              period={salesPeriod}
              onPeriodChange={handleSalesPeriodChange}
            />
          </CardContent>
        </Card>
      </div>

      {/* Row 4: Daily Breakdown (full width) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">Daily Activity Breakdown</CardTitle>
          <p className="text-sm text-muted-foreground">Granular daily statistics per agent</p>
        </CardHeader>
        <CardContent>
          <DailyBreakdownTable
            data={dailyData}
            date={dailyDate}
            onDateChange={handleDailyDateChange}
          />
        </CardContent>
      </Card>
    </div>
  );
}
