import { auth, type ExtendedSession } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Building2, TrendingUp, DollarSign } from "lucide-react";
import { LeadAnalyticsChart } from "./lead-analytics-chart";
import { SalesPipeline } from "./sales-pipeline";

export default async function DashboardPage() {
  const session = (await auth()) as ExtendedSession | null;

  const stats = [
    {
      title: "Total Leads",
      value: "2,847",
      change: "+12.5% vs last month",
      changeType: "positive" as const,
      icon: Users,
      iconBg: "bg-red-50",
      iconColor: "text-[#dc2626]",
    },
    {
      title: "Active Properties",
      value: "156",
      change: "+8.2% vs last month",
      changeType: "positive" as const,
      icon: Building2,
      iconBg: "bg-red-50",
      iconColor: "text-[#dc2626]",
    },
    {
      title: "Conversion Rate",
      value: "24.8%",
      change: "+3.1% vs last month",
      changeType: "positive" as const,
      icon: TrendingUp,
      iconBg: "bg-red-50",
      iconColor: "text-[#dc2626]",
    },
    {
      title: "Revenue",
      value: "$1.2M",
      change: "-2.4% vs last month",
      changeType: "negative" as const,
      icon: DollarSign,
      iconBg: "bg-red-50",
      iconColor: "text-[#dc2626]",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500">
          Welcome back, {session?.user?.firstName}. Here&apos;s what&apos;s
          happening today.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="border border-gray-200">
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
                    <span
                      className={
                        stat.changeType === "positive"
                          ? "text-emerald-600"
                          : "text-red-500"
                      }
                    >
                      {stat.changeType === "positive" ? "↗" : "↘"} {stat.change}
                    </span>
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
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Lead Analytics Chart - Takes 2/3 */}
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
            <select className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600">
              <option>Last 12 month</option>
              <option>Last 6 months</option>
              <option>Last 3 months</option>
            </select>
          </CardHeader>
          <CardContent>
            <LeadAnalyticsChart />
          </CardContent>
        </Card>

        {/* Sales Pipeline - Takes 1/3 */}
        <Card className="border border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold text-gray-900">
              Sales Pipeline
            </CardTitle>
            <p className="text-sm text-gray-500">
              Lead progression through stages
            </p>
          </CardHeader>
          <CardContent>
            <SalesPipeline />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
