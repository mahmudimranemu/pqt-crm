import { getYearlyKPIs } from "@/lib/actions/kpis";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Users,
  Calendar,
  Eye,
  DollarSign,
  Wallet,
  Target,
  TrendingUp,
  Award,
  Flag,
} from "lucide-react";

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

export default async function YearlyKPIsPage() {
  const data = await getYearlyKPIs();

  const metrics: {
    title: string;
    value: number;
    target: number;
    icon: React.ElementType;
    isCurrency?: boolean;
  }[] = [
    { title: "Total Leads", ...data.metrics.totalLeads, icon: Users },
    { title: "Total Bookings", ...data.metrics.totalBookings, icon: Calendar },
    {
      title: "Completed Viewings",
      ...data.metrics.completedViewings,
      icon: Eye,
    },
    { title: "Total Sales", ...data.metrics.totalSales, icon: Target },
    {
      title: "Total Revenue",
      ...data.metrics.totalRevenue,
      icon: DollarSign,
      isCurrency: true,
    },
    {
      title: "Total Commission",
      ...data.metrics.totalCommission,
      icon: Wallet,
      isCurrency: true,
    },
  ];

  // Calculate max revenue for chart scaling
  const maxRevenue = Math.max(...data.monthlyData.map((m) => m.revenue), 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Yearly KPIs</h1>
        <p className="text-muted-foreground">
          {data.year} Performance Overview
        </p>
      </div>

      {/* Key Insights */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-gradient-to-br from-[#dc2626] to-[#991b1b] text-white">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 opacity-80" />
              <div>
                <p className="text-white/80 text-sm">Lead to Viewing</p>
                <p className="text-2xl font-bold">
                  {data.insights.leadToViewingRate.toFixed(1)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#dc2626] to-[#ef4444] text-white">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Award className="h-8 w-8 opacity-80" />
              <div>
                <p className="text-white/80 text-sm">Viewing to Sale</p>
                <p className="text-2xl font-bold">
                  {data.insights.viewingToSaleRate.toFixed(1)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-600 to-green-700 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <DollarSign className="h-8 w-8 opacity-80" />
              <div>
                <p className="text-white/80 text-sm">Avg Deal Size</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(data.insights.averageDealSize)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-600 to-purple-700 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Flag className="h-8 w-8 opacity-80" />
              <div>
                <p className="text-white/80 text-sm">Citizenship Sales</p>
                <p className="text-2xl font-bold">
                  {data.insights.citizenshipSales}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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

      {/* Monthly Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <div className="flex h-full items-end gap-2">
              {data.monthlyData.map((month) => (
                <div
                  key={month.month}
                  className="flex-1 flex flex-col items-center"
                >
                  <div
                    className="w-full bg-[#dc2626] rounded-t transition-all hover:bg-[#dc2626] cursor-pointer"
                    style={{
                      height: `${(month.revenue / maxRevenue) * 100}%`,
                      minHeight: month.revenue > 0 ? "4px" : "0px",
                    }}
                    title={`${month.month}: ${formatCurrency(month.revenue)}`}
                  />
                  <span className="text-xs text-muted-foreground mt-2">
                    {month.month}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Breakdown Table */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2">Month</th>
                  <th className="text-right py-3 px-2">Sales</th>
                  <th className="text-right py-3 px-2">Revenue</th>
                  <th className="text-right py-3 px-2">Avg per Sale</th>
                </tr>
              </thead>
              <tbody>
                {data.monthlyData.map((month) => (
                  <tr key={month.month} className="border-b last:border-0">
                    <td className="py-3 px-2 font-medium">{month.month}</td>
                    <td className="text-right py-3 px-2">{month.sales}</td>
                    <td className="text-right py-3 px-2">
                      {formatCurrency(month.revenue)}
                    </td>
                    <td className="text-right py-3 px-2">
                      {month.sales > 0
                        ? formatCurrency(month.revenue / month.sales)
                        : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-muted/50 font-medium">
                  <td className="py-3 px-2">Total</td>
                  <td className="text-right py-3 px-2">
                    {data.monthlyData.reduce((acc, m) => acc + m.sales, 0)}
                  </td>
                  <td className="text-right py-3 px-2">
                    {formatCurrency(
                      data.monthlyData.reduce((acc, m) => acc + m.revenue, 0),
                    )}
                  </td>
                  <td className="text-right py-3 px-2">
                    {data.metrics.totalSales.value > 0
                      ? formatCurrency(
                          data.metrics.totalRevenue.value /
                            data.metrics.totalSales.value,
                        )
                      : "-"}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
