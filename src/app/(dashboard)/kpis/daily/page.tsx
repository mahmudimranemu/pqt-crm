import { getDailyKPIs } from "@/lib/actions/kpis";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Phone,
  Users,
  Calendar,
  Eye,
  DollarSign,
  Target,
  TrendingUp,
  TrendingDown,
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
  const isOnTrack = percentage >= 80;

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
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-muted-foreground">
            Target: {isCurrency ? formatCurrency(target) : target}
          </span>
          {isOnTrack ? (
            <span className="text-xs text-green-600 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> On Track
            </span>
          ) : (
            <span className="text-xs text-amber-600 flex items-center gap-1">
              <TrendingDown className="h-3 w-3" /> Behind
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default async function DailyKPIsPage() {
  const data = await getDailyKPIs();

  const metrics = [
    {
      title: "Calls Made",
      value: data.metrics.callsMade.value,
      target: data.metrics.callsMade.target,
      icon: Phone
    },
    {
      title: "New Leads",
      value: data.metrics.newLeads.value,
      target: data.metrics.newLeads.target,
      icon: Users
    },
    {
      title: "Bookings Scheduled",
      value: data.metrics.bookingsScheduled.value,
      target: data.metrics.bookingsScheduled.target,
      icon: Calendar
    },
    {
      title: "Viewings Completed",
      value: data.metrics.viewingsCompleted.value,
      target: data.metrics.viewingsCompleted.target,
      icon: Eye
    },
    {
      title: "Sales Closed",
      value: data.metrics.salesClosed.value,
      target: data.metrics.salesClosed.target,
      icon: Target
    },
    {
      title: "Sales Revenue",
      value: data.metrics.salesRevenue.value,
      target: data.metrics.salesRevenue.target,
      icon: DollarSign,
      isCurrency: true,
    },
  ];

  // Calculate overall daily score
  const overallScore = metrics.reduce((acc, metric) => {
    const percentage = metric.target > 0 ? (metric.value / metric.target) * 100 : 0;
    return acc + Math.min(percentage, 100);
  }, 0) / metrics.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Daily KPIs</h1>
        <p className="text-muted-foreground">
          {data.date.toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric"
          })}
        </p>
      </div>

      {/* Overall Score */}
      <Card className="bg-gradient-to-r from-[#dc2626] to-[#991b1b] text-white">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm">Overall Daily Score</p>
              <p className="text-4xl font-bold mt-1">{overallScore.toFixed(0)}%</p>
              <p className="text-white/80 text-sm mt-2">
                {overallScore >= 80
                  ? "Excellent! You're on track to hit your targets."
                  : overallScore >= 50
                  ? "Good progress. Keep pushing!"
                  : "Let's pick up the pace to hit today's targets."}
              </p>
            </div>
            <div className="text-6xl opacity-20">
              <Target className="h-24 w-24" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Individual Metrics */}
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
    </div>
  );
}
