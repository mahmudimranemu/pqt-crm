import { getMonthlyKPIs } from "@/lib/actions/kpis";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Phone,
  Users,
  Calendar,
  Eye,
  DollarSign,
  Wallet,
  Target,
} from "lucide-react";
import { MonthlyRevenueChart, MonthlyTargetChart } from "./monthly-charts";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function MetricCard({
  title,
  value,
  target,
  icon: Icon,
  isCurrency = false,
}: {
  title: string;
  value: number;
  target: number;
  icon: React.ElementType;
  isCurrency?: boolean;
}) {
  const percentage = target > 0 ? Math.min((value / target) * 100, 100) : 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-gray-900">
          {isCurrency ? formatCurrency(value) : value}
        </div>
        <div className="flex items-center gap-2 mt-2">
          <Progress value={percentage} className="h-2" />
          <span className="text-xs text-muted-foreground min-w-[40px]">
            {percentage.toFixed(0)}%
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Target: {isCurrency ? formatCurrency(target) : target}
        </p>
      </CardContent>
    </Card>
  );
}

export default async function MonthlyKPIsPage() {
  const data = await getMonthlyKPIs();

  const metrics: {
    title: string;
    value: number;
    target: number;
    icon: React.ElementType;
    isCurrency?: boolean;
  }[] = [
    { title: "Total Calls", ...data.metrics.totalCalls, icon: Phone },
    { title: "New Leads", ...data.metrics.totalLeads, icon: Users },
    { title: "Total Bookings", ...data.metrics.totalBookings, icon: Calendar },
    {
      title: "Completed Viewings",
      ...data.metrics.completedViewings,
      icon: Eye,
    },
    { title: "Total Sales", ...data.metrics.totalSales, icon: Target },
    {
      title: "Revenue",
      ...data.metrics.totalRevenue,
      icon: DollarSign,
      isCurrency: true,
    },
    {
      title: "Commission",
      ...data.metrics.totalCommission,
      icon: Wallet,
      isCurrency: true,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Monthly KPIs</h1>
        <p className="text-muted-foreground">
          {data.monthName} {data.year}
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <MetricCard
            key={metric.title}
            title={metric.title}
            value={metric.value}
            target={metric.target}
            icon={metric.icon}
            isCurrency={metric.isCurrency}
          />
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Daily Revenue & Activity Chart */}
        <Card className="border border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">
              Daily Revenue & Activity
            </CardTitle>
            <p className="text-sm text-gray-500">
              Revenue, sales, and bookings by day
            </p>
          </CardHeader>
          <CardContent>
            <MonthlyRevenueChart data={data.dailyData} />
          </CardContent>
        </Card>

        {/* Actual vs Target */}
        <Card className="border border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">
              Actual vs Target
            </CardTitle>
            <p className="text-sm text-gray-500">
              Monthly progress against targets
            </p>
          </CardHeader>
          <CardContent>
            <MonthlyTargetChart metrics={data.metrics} />
          </CardContent>
        </Card>
      </div>

      {/* Daily Sales Table */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2 text-center">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div
                key={day}
                className="text-xs font-medium text-muted-foreground py-2"
              >
                {day}
              </div>
            ))}
            {/* Add empty cells for day offset */}
            {Array.from({
              length: new Date(data.year, data.month, 1).getDay(),
            }).map((_, i) => (
              <div key={`empty-${i}`} className="p-2" />
            ))}
            {data.dailyData.map((day) => (
              <div
                key={day.day}
                className={`p-2 rounded text-xs ${
                  day.sales > 0
                    ? "bg-green-100 text-green-800 font-medium"
                    : day.bookings > 0
                      ? "bg-blue-50 text-blue-800"
                      : "bg-gray-50"
                }`}
              >
                <div className="font-medium">{day.day}</div>
                {day.sales > 0 && (
                  <div>
                    {day.sales} sale{day.sales > 1 ? "s" : ""}
                  </div>
                )}
                {day.bookings > 0 && !day.sales && (
                  <div>{day.bookings} book</div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
