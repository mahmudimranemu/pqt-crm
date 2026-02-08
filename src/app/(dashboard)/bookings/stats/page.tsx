import { getBookingStats } from "@/lib/actions/bookings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Calendar,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  XCircle,
  Target
} from "lucide-react";

export default async function BookingStatsPage() {
  const stats = await getBookingStats();

  const monthChange = stats.lastMonthBookings > 0
    ? ((stats.thisMonthBookings - stats.lastMonthBookings) / stats.lastMonthBookings) * 100
    : 0;

  const statCards = [
    {
      title: "Total Bookings",
      value: stats.totalBookings,
      icon: Calendar,
      description: "All time bookings",
    },
    {
      title: "This Month",
      value: stats.thisMonthBookings,
      icon: monthChange >= 0 ? TrendingUp : TrendingDown,
      description: `${monthChange >= 0 ? "+" : ""}${monthChange.toFixed(1)}% vs last month`,
      trend: monthChange >= 0 ? "up" : "down",
    },
    {
      title: "Completed",
      value: stats.completedBookings,
      icon: CheckCircle,
      description: "Completed viewings",
    },
    {
      title: "Sales",
      value: stats.soldBookings,
      icon: Target,
      description: "Bookings that converted",
    },
    {
      title: "Conversion Rate",
      value: `${stats.conversionRate.toFixed(1)}%`,
      icon: TrendingUp,
      description: "Completed → Sold",
    },
    {
      title: "Last Month",
      value: stats.lastMonthBookings,
      icon: Calendar,
      description: "Previous month bookings",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Booking Statistics</h1>
        <p className="text-muted-foreground">
          Overview of your booking performance
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon
                className={`h-4 w-4 ${
                  stat.trend === "up"
                    ? "text-green-500"
                    : stat.trend === "down"
                    ? "text-red-500"
                    : "text-muted-foreground"
                }`}
              />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Booking Funnel</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center">
                <div className="w-32 text-sm">Total Bookings</div>
                <div className="flex-1">
                  <div className="h-4 bg-[#dc2626] rounded" style={{ width: "100%" }} />
                </div>
                <div className="w-16 text-right text-sm font-medium">{stats.totalBookings}</div>
              </div>
              <div className="flex items-center">
                <div className="w-32 text-sm">Completed</div>
                <div className="flex-1">
                  <div
                    className="h-4 bg-[#dc2626] rounded"
                    style={{
                      width: `${stats.totalBookings > 0 ? (stats.completedBookings / stats.totalBookings) * 100 : 0}%`
                    }}
                  />
                </div>
                <div className="w-16 text-right text-sm font-medium">{stats.completedBookings}</div>
              </div>
              <div className="flex items-center">
                <div className="w-32 text-sm">Sold</div>
                <div className="flex-1">
                  <div
                    className="h-4 bg-green-500 rounded"
                    style={{
                      width: `${stats.totalBookings > 0 ? (stats.soldBookings / stats.totalBookings) * 100 : 0}%`
                    }}
                  />
                </div>
                <div className="w-16 text-right text-sm font-medium">{stats.soldBookings}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Performance Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-2 border-b">
                <span className="text-sm text-muted-foreground">Booking to Completion Rate</span>
                <span className="font-medium">
                  {stats.totalBookings > 0
                    ? ((stats.completedBookings / stats.totalBookings) * 100).toFixed(1)
                    : 0}%
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b">
                <span className="text-sm text-muted-foreground">Completion to Sale Rate</span>
                <span className="font-medium">{stats.conversionRate.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b">
                <span className="text-sm text-muted-foreground">Overall Conversion</span>
                <span className="font-medium">
                  {stats.totalBookings > 0
                    ? ((stats.soldBookings / stats.totalBookings) * 100).toFixed(1)
                    : 0}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Avg Monthly Bookings</span>
                <span className="font-medium">
                  {((stats.thisMonthBookings + stats.lastMonthBookings) / 2).toFixed(0)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
