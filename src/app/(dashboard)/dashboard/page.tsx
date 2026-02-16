import { auth, type ExtendedSession } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  Building2,
  TrendingUp,
  DollarSign,
  Target,
  Handshake,
  CheckSquare,
  Zap,
} from "lucide-react";
import { LeadAnalyticsChart } from "./lead-analytics-chart";
import { SalesPipeline } from "./sales-pipeline";
import { RevenueTrendChart } from "./revenue-trend-chart";
import { ConversionFunnel } from "./conversion-funnel";
import { SourceBreakdown } from "./source-breakdown";
import { WonVsLostChart } from "./won-vs-lost-chart";
import { getLeadStats, getLeadAnalytics } from "@/lib/actions/leads";
import { getDealStats } from "@/lib/actions/deals";
import { getOverdueTasksCount } from "@/lib/actions/tasks";
import {
  getRevenueTrend,
  getConversionFunnel,
  getSourceBreakdown,
  getWonVsLost,
} from "@/lib/actions/analytics";
import Link from "next/link";

export default async function DashboardPage() {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) return null;

  let leadStats = { total: 0, newThisWeek: 0, avgScore: 0, byStage: {} };
  let dealStats = {
    total: 0,
    pipelineValue: 0 as number,
    wonCount: 0,
    wonValue: 0 as number,
    byStage: [] as { stage: string; count: number; value: number }[],
  };
  let overdueTasks = 0;
  let leadAnalytics: { month: string; leads: number; conversions: number }[] =
    [];
  let revenueTrend: { month: string; revenue: number }[] = [];
  let conversionFunnel: { stage: string; count: number }[] = [];
  let sourceBreakdown: { source: string; count: number }[] = [];
  let wonVsLost: { month: string; won: number; lost: number }[] = [];

  try {
    [
      leadStats,
      dealStats,
      overdueTasks,
      leadAnalytics,
      revenueTrend,
      conversionFunnel,
      sourceBreakdown,
      wonVsLost,
    ] = await Promise.all([
      getLeadStats(),
      getDealStats(),
      getOverdueTasksCount(),
      getLeadAnalytics(),
      getRevenueTrend(),
      getConversionFunnel(),
      getSourceBreakdown(),
      getWonVsLost(),
    ]);
  } catch {
    // Stats may fail if tables are empty; that's fine
  }

  const stats = [
    {
      title: "Total Leads",
      value: leadStats.total.toLocaleString(),
      subtitle: `${leadStats.newThisWeek} new this week`,
      icon: Target,
      iconBg: "bg-blue-50",
      iconColor: "text-[#dc2626]",
      href: "/leads",
    },
    {
      title: "Active Deals",
      value: dealStats.total.toLocaleString(),
      subtitle: `$${Number(dealStats.pipelineValue).toLocaleString()} pipeline`,
      icon: Handshake,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
      href: "/deals",
    },
    {
      title: "Won Deals",
      value: dealStats.wonCount.toLocaleString(),
      subtitle: `$${Number(dealStats.wonValue).toLocaleString()} revenue`,
      icon: DollarSign,
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
      href: "/deals",
    },
    {
      title: "Overdue Tasks",
      value: overdueTasks.toLocaleString(),
      subtitle: overdueTasks > 0 ? "Needs attention" : "All on track",
      icon: CheckSquare,
      iconBg: overdueTasks > 0 ? "bg-red-50" : "bg-emerald-50",
      iconColor: overdueTasks > 0 ? "text-[#dc2626]" : "text-emerald-600",
      href: "/tasks",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500">
          Welcome back, {session.user.firstName}. Here&apos;s what&apos;s
          happening today.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.title} href={stat.href}>
            <Card className="border border-gray-200 transition-shadow hover:shadow-md">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      {stat.title}
                    </p>
                    <p className="mt-1 text-3xl font-bold text-gray-900">
                      {stat.value}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {stat.subtitle}
                    </p>
                  </div>
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl ${stat.iconBg}`}
                  >
                    <stat.icon className={`h-6 w-6 ${stat.iconColor}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Lead Analytics Chart */}
        <Card className="lg:col-span-2 border border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg font-semibold text-gray-900">
                Lead Analytics
              </CardTitle>
              <p className="text-sm text-gray-500">
                Monthly leads and conversion trends
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <LeadAnalyticsChart data={leadAnalytics} />
          </CardContent>
        </Card>

        {/* Sales Pipeline */}
        <Card className="border border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold text-gray-900">
              Deal Pipeline
            </CardTitle>
            <p className="text-sm text-gray-500">
              Deal progression through stages
            </p>
          </CardHeader>
          <CardContent>
            <SalesPipeline stages={dealStats.byStage} />
          </CardContent>
        </Card>
      </div>

      {/* Revenue & Funnel Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold text-gray-900">
              Revenue Trend
            </CardTitle>
            <p className="text-sm text-gray-500">
              Monthly revenue over the last 6 months
            </p>
          </CardHeader>
          <CardContent>
            <RevenueTrendChart data={revenueTrend} />
          </CardContent>
        </Card>

        <Card className="border border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold text-gray-900">
              Conversion Funnel
            </CardTitle>
            <p className="text-sm text-gray-500">
              Enquiry to won deal progression
            </p>
          </CardHeader>
          <CardContent>
            <ConversionFunnel data={conversionFunnel} />
          </CardContent>
        </Card>
      </div>

      {/* Source & Won/Lost Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold text-gray-900">
              Lead Sources
            </CardTitle>
            <p className="text-sm text-gray-500">Where your leads come from</p>
          </CardHeader>
          <CardContent>
            <SourceBreakdown data={sourceBreakdown} />
          </CardContent>
        </Card>

        <Card className="border border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold text-gray-900">
              Won vs Lost Deals
            </CardTitle>
            <p className="text-sm text-gray-500">
              Deal outcomes over the last 6 months
            </p>
          </CardHeader>
          <CardContent>
            <WonVsLostChart data={wonVsLost} />
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-4">
        {[
          {
            title: "New Lead",
            href: "/leads/create",
            icon: Target,
            color: "text-[#dc2626]",
          },
          {
            title: "New Deal",
            href: "/deals/create",
            icon: Handshake,
            color: "text-blue-600",
          },
          {
            title: "New Task",
            href: "/tasks",
            icon: CheckSquare,
            color: "text-purple-600",
          },
          {
            title: "View Reports",
            href: "/reports",
            icon: TrendingUp,
            color: "text-emerald-600",
          },
        ].map((action) => (
          <Link key={action.title} href={action.href}>
            <Card className="border border-gray-200 transition-all hover:shadow-md hover:border-gray-300 cursor-pointer">
              <CardContent className="flex items-center gap-3 p-4">
                <action.icon className={`h-5 w-5 ${action.color}`} />
                <span className="text-sm font-medium text-gray-700">
                  {action.title}
                </span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
