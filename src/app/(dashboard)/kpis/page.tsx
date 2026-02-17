import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Calendar,
  CalendarDays,
  CalendarRange,
  TrendingUp,
  ArrowRight,
  Phone,
  Users,
  DollarSign,
  Target,
  Trophy,
  BarChart3,
  UserCheck,
} from "lucide-react";
import {
  getDailyKPIs,
  getMonthlyKPIs,
  getYearlyKPIs,
} from "@/lib/actions/kpis";
import {
  getAgentClientDistribution,
  getAgentSalesPerformance,
} from "@/lib/actions/agent-performance";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default async function KPIsPage() {
  // Fetch all data in parallel
  const [daily, monthly, yearly, clientDist, salesPerf] = await Promise.all([
    getDailyKPIs(),
    getMonthlyKPIs(),
    getYearlyKPIs(),
    getAgentClientDistribution(),
    getAgentSalesPerformance(),
  ]);

  // Calculate daily overview
  const dailyMetrics = [
    {
      label: "Calls Made",
      value: daily.metrics.callsMade.value,
      target: daily.metrics.callsMade.target,
    },
    {
      label: "New Leads",
      value: daily.metrics.newLeads.value,
      target: daily.metrics.newLeads.target,
    },
    {
      label: "Bookings",
      value: daily.metrics.bookingsScheduled.value,
      target: daily.metrics.bookingsScheduled.target,
    },
    {
      label: "Viewings",
      value: daily.metrics.viewingsCompleted.value,
      target: daily.metrics.viewingsCompleted.target,
    },
    {
      label: "Sales",
      value: daily.metrics.salesClosed.value,
      target: daily.metrics.salesClosed.target,
    },
    {
      label: "Revenue",
      value: daily.metrics.salesRevenue.value,
      target: daily.metrics.salesRevenue.target,
      isCurrency: true,
    },
  ];
  const dailyOverallScore =
    dailyMetrics.reduce((acc, m) => {
      const pct = m.target > 0 ? (m.value / m.target) * 100 : 0;
      return acc + Math.min(pct, 100);
    }, 0) / dailyMetrics.length;

  // Monthly overview
  const monthlyMetrics = monthly.metrics;
  const monthlyOverallScore =
    [
      monthlyMetrics.totalCalls,
      monthlyMetrics.totalLeads,
      monthlyMetrics.totalBookings,
      monthlyMetrics.completedViewings,
      monthlyMetrics.totalSales,
      monthlyMetrics.totalRevenue,
      monthlyMetrics.totalCommission,
    ].reduce((acc, m) => {
      const pct = m.target > 0 ? (m.value / m.target) * 100 : 0;
      return acc + Math.min(pct, 100);
    }, 0) / 7;

  // Yearly overview
  const yearlyMetrics = yearly.metrics;
  const yearlyOverallScore =
    [
      yearlyMetrics.totalLeads,
      yearlyMetrics.totalBookings,
      yearlyMetrics.completedViewings,
      yearlyMetrics.totalSales,
      yearlyMetrics.totalRevenue,
      yearlyMetrics.totalCommission,
    ].reduce((acc, m) => {
      const pct = m.target > 0 ? (m.value / m.target) * 100 : 0;
      return acc + Math.min(pct, 100);
    }, 0) / 6;

  // Agent performance overview
  const totalClients = clientDist.reduce((sum, a) => sum + a.count, 0);
  const totalAgents = salesPerf.length;
  const topPerformer =
    salesPerf.length > 0
      ? salesPerf.reduce((best, a) =>
          a.totalRevenue > best.totalRevenue ? a : best,
        )
      : null;
  const totalAgentRevenue = salesPerf.reduce(
    (sum, a) => sum + a.totalRevenue,
    0,
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">KPI Dashboards</h1>
        <p className="text-muted-foreground">
          Track performance metrics and targets across all timeframes
        </p>
      </div>

      {/* Daily KPIs Overview */}
      <Link href="/kpis/daily" className="block group">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-red-50">
                <Calendar className="h-5 w-5 text-[#dc2626]" />
              </div>
              <div>
                <CardTitle className="text-lg">Daily KPIs</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Today&apos;s performance against targets
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">
                  {dailyOverallScore.toFixed(0)}%
                </p>
                <p className="text-xs text-muted-foreground">Overall Score</p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-[#dc2626] transition-colors" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {dailyMetrics.map((m) => {
                const pct =
                  m.target > 0 ? Math.min((m.value / m.target) * 100, 100) : 0;
                return (
                  <div key={m.label} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {m.label}
                      </span>
                      <span className="text-xs font-medium">
                        {pct.toFixed(0)}%
                      </span>
                    </div>
                    <Progress value={pct} className="h-1.5" />
                    <p className="text-sm font-semibold text-gray-900">
                      {m.isCurrency ? formatCurrency(m.value) : m.value}
                      <span className="text-xs font-normal text-muted-foreground">
                        {" "}
                        / {m.isCurrency ? formatCurrency(m.target) : m.target}
                      </span>
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </Link>

      {/* Monthly KPIs Overview */}
      <Link href="/kpis/monthly" className="block group">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-blue-50">
                <CalendarDays className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Monthly KPIs</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {new Date().toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  })}{" "}
                  progress
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">
                  {monthlyOverallScore.toFixed(0)}%
                </p>
                <p className="text-xs text-muted-foreground">Overall Score</p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-blue-600 transition-colors" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                {
                  label: "Calls",
                  value: monthlyMetrics.totalCalls.value,
                  target: monthlyMetrics.totalCalls.target,
                  icon: Phone,
                },
                {
                  label: "Leads",
                  value: monthlyMetrics.totalLeads.value,
                  target: monthlyMetrics.totalLeads.target,
                  icon: Users,
                },
                {
                  label: "Sales",
                  value: monthlyMetrics.totalSales.value,
                  target: monthlyMetrics.totalSales.target,
                  icon: Target,
                },
                {
                  label: "Revenue",
                  value: monthlyMetrics.totalRevenue.value,
                  target: monthlyMetrics.totalRevenue.target,
                  icon: DollarSign,
                  isCurrency: true,
                },
              ].map((m) => {
                const pct =
                  m.target > 0 ? Math.min((m.value / m.target) * 100, 100) : 0;
                return (
                  <div
                    key={m.label}
                    className="flex items-center gap-3 p-3 rounded-lg bg-gray-50"
                  >
                    <m.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">{m.label}</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {m.isCurrency ? formatCurrency(m.value) : m.value}
                      </p>
                      <Progress value={pct} className="h-1 mt-1" />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </Link>

      {/* Yearly KPIs Overview */}
      <Link href="/kpis/yearly" className="block group">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-green-50">
                <CalendarRange className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Yearly KPIs</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {new Date().getFullYear()} annual performance
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">
                  {yearlyOverallScore.toFixed(0)}%
                </p>
                <p className="text-xs text-muted-foreground">Overall Score</p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-green-600 transition-colors" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 rounded-lg bg-gray-50">
                <p className="text-xs text-muted-foreground">Total Sales</p>
                <p className="text-xl font-bold text-gray-900">
                  {yearlyMetrics.totalSales.value}
                </p>
                <p className="text-xs text-muted-foreground">
                  Target: {yearlyMetrics.totalSales.target}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-gray-50">
                <p className="text-xs text-muted-foreground">Total Revenue</p>
                <p className="text-xl font-bold text-gray-900">
                  {formatCurrency(yearlyMetrics.totalRevenue.value)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Target: {formatCurrency(yearlyMetrics.totalRevenue.target)}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-gray-50">
                <p className="text-xs text-muted-foreground">Conversion Rate</p>
                <p className="text-xl font-bold text-gray-900">
                  {yearly.insights.viewingToSaleRate.toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground">Viewing → Sale</p>
              </div>
              <div className="p-3 rounded-lg bg-gray-50">
                <p className="text-xs text-muted-foreground">Avg Deal Size</p>
                <p className="text-xl font-bold text-gray-900">
                  {formatCurrency(yearly.insights.averageDealSize)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {yearly.insights.citizenshipSales} citizenship sales
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>

      {/* Agent Performance Overview */}
      <Link href="/kpis/performance" className="block group">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-purple-50">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Agent Performance</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Sales agent statistics and workload
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">
                  {totalAgents}
                </p>
                <p className="text-xs text-muted-foreground">Active Agents</p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-purple-600 transition-colors" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                <UserCheck className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Total Clients</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {totalClients}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                <BarChart3 className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Avg / Agent</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {totalAgents > 0
                      ? Math.round(totalClients / totalAgents)
                      : 0}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                <DollarSign className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Total Revenue</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {formatCurrency(totalAgentRevenue)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                <Trophy className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Top Performer</p>
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {topPerformer?.agentName || "N/A"}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}
