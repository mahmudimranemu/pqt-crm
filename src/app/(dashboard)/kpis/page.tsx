import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, CalendarDays, CalendarRange, TrendingUp } from "lucide-react";

export default function KPIsPage() {
  const kpiDashboards = [
    {
      title: "Daily KPIs",
      description: "Track today's performance against daily targets",
      href: "/kpis/daily",
      icon: Calendar,
    },
    {
      title: "Monthly KPIs",
      description: "Monthly performance metrics and trends",
      href: "/kpis/monthly",
      icon: CalendarDays,
    },
    {
      title: "Yearly KPIs",
      description: "Annual performance overview and targets",
      href: "/kpis/yearly",
      icon: CalendarRange,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">KPI Dashboards</h1>
        <p className="text-muted-foreground">
          Track performance metrics and targets
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {kpiDashboards.map((dashboard) => (
          <Link key={dashboard.href} href={dashboard.href}>
            <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-blue-50">
                    <dashboard.icon className="h-6 w-6 text-gray-900" />
                  </div>
                  <CardTitle>{dashboard.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{dashboard.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
