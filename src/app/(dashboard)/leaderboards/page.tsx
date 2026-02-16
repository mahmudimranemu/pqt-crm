import { getAgentLeaderboard } from "@/lib/actions/sales";
import { getAgentPerformance } from "@/lib/actions/kpis";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Trophy,
  Medal,
  Award,
  DollarSign,
  Target,
  Phone,
  Calendar,
  TrendingUp,
} from "lucide-react";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function getRankIcon(rank: number) {
  switch (rank) {
    case 1:
      return <Trophy className="h-6 w-6 text-yellow-500" />;
    case 2:
      return <Medal className="h-6 w-6 text-gray-400" />;
    case 3:
      return <Award className="h-6 w-6 text-amber-600" />;
    default:
      return (
        <span className="text-lg font-bold text-muted-foreground">{rank}</span>
      );
  }
}

function getRankBadge(rank: number) {
  switch (rank) {
    case 1:
      return (
        <Badge className="bg-yellow-500 hover:bg-yellow-600">1st Place</Badge>
      );
    case 2:
      return <Badge className="bg-gray-400 hover:bg-gray-500">2nd Place</Badge>;
    case 3:
      return (
        <Badge className="bg-amber-600 hover:bg-amber-700">3rd Place</Badge>
      );
    default:
      return null;
  }
}

interface LeaderboardEntry {
  agentId: string;
  agentName: string;
  office: string;
  salesCount: number;
  totalRevenue: number;
  totalCommission: number;
  bookings?: number;
  calls?: number;
}

function LeaderboardTable({
  data,
  showExtended = false,
}: {
  data: LeaderboardEntry[];
  showExtended?: boolean;
}) {
  if (data.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          No data available for this period.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top 3 Podium */}
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        {data.slice(0, 3).map((agent, index) => (
          <Card
            key={agent.agentId}
            className={`${
              index === 0
                ? "bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-300"
                : index === 1
                  ? "bg-gradient-to-br from-gray-50 to-gray-100 border-gray-300"
                  : "bg-gradient-to-br from-amber-50 to-amber-100 border-amber-300"
            } ${index === 0 ? "md:order-2" : index === 1 ? "md:order-1" : "md:order-3"}`}
          >
            <CardContent className="pt-6 text-center">
              <div className="flex justify-center mb-3">
                {getRankIcon(index + 1)}
              </div>
              <h3 className="font-semibold text-lg text-gray-900">
                {agent.agentName}
              </h3>
              <p className="text-sm text-muted-foreground">{agent.office}</p>
              <div className="mt-4 space-y-2">
                <div className="text-2xl font-bold text-[#dc2626]">
                  {formatCurrency(agent.totalRevenue)}
                </div>
                <div className="flex justify-center gap-4 text-sm">
                  <span className="flex items-center gap-1">
                    <Target className="h-4 w-4" />
                    {agent.salesCount} sales
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Full Leaderboard Table */}
      <Card>
        <CardHeader>
          <CardTitle>Full Rankings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2 w-16">Rank</th>
                  <th className="text-left py-3 px-2">Agent</th>
                  <th className="text-left py-3 px-2">Office</th>
                  <th className="text-right py-3 px-2">Sales</th>
                  <th className="text-right py-3 px-2">Revenue</th>
                  <th className="text-right py-3 px-2">Commission</th>
                  {showExtended && (
                    <>
                      <th className="text-right py-3 px-2">Bookings</th>
                      <th className="text-right py-3 px-2">Calls</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {data.map((agent, index) => (
                  <tr
                    key={agent.agentId}
                    className={`border-b last:border-0 ${
                      index < 3 ? "bg-muted/30" : ""
                    }`}
                  >
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2">
                        {getRankIcon(index + 1)}
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{agent.agentName}</span>
                        {getRankBadge(index + 1)}
                      </div>
                    </td>
                    <td className="py-3 px-2 text-muted-foreground">
                      {agent.office}
                    </td>
                    <td className="text-right py-3 px-2 font-medium">
                      {agent.salesCount}
                    </td>
                    <td className="text-right py-3 px-2 font-medium text-gray-900">
                      {formatCurrency(agent.totalRevenue)}
                    </td>
                    <td className="text-right py-3 px-2 text-[#dc2626]">
                      {formatCurrency(agent.totalCommission)}
                    </td>
                    {showExtended && (
                      <>
                        <td className="text-right py-3 px-2">
                          {agent.bookings || 0}
                        </td>
                        <td className="text-right py-3 px-2">
                          {agent.calls || 0}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default async function LeaderboardsPage() {
  const [monthlyData, quarterlyData, yearlyData, performanceData] =
    await Promise.all([
      getAgentLeaderboard("month"),
      getAgentLeaderboard("quarter"),
      getAgentLeaderboard("year"),
      getAgentPerformance("month").catch(() => []),
    ]);

  // Merge performance data with monthly data
  const monthlyWithPerformance = monthlyData.map((agent) => {
    const perf = performanceData.find(
      (p: { agentId: string; bookings?: number; calls?: number }) =>
        p.agentId === agent.agentId,
    );
    return {
      ...agent,
      bookings: perf?.bookings || 0,
      calls: perf?.calls || 0,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Leaderboards</h1>
        <p className="text-muted-foreground">
          Top performing agents by revenue
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Trophy className="h-5 w-5 text-gray-900" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Top Seller (Month)
                </p>
                <p className="font-semibold">
                  {monthlyData[0]?.agentName || "N/A"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <DollarSign className="h-5 w-5 text-[#dc2626]" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Top Revenue (Month)
                </p>
                <p className="font-semibold">
                  {formatCurrency(monthlyData[0]?.totalRevenue || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Target className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Total Sales (Month)
                </p>
                <p className="font-semibold">
                  {monthlyData.reduce((acc, a) => acc + a.salesCount, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Agents</p>
                <p className="font-semibold">{monthlyData.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Leaderboard Tabs */}
      <Tabs defaultValue="monthly" className="w-full">
        <TabsList>
          <TabsTrigger value="monthly">This Month</TabsTrigger>
          <TabsTrigger value="quarterly">This Quarter</TabsTrigger>
          <TabsTrigger value="yearly">This Year</TabsTrigger>
        </TabsList>

        <TabsContent value="monthly" className="mt-6">
          <LeaderboardTable data={monthlyWithPerformance} showExtended />
        </TabsContent>

        <TabsContent value="quarterly" className="mt-6">
          <LeaderboardTable data={quarterlyData} />
        </TabsContent>

        <TabsContent value="yearly" className="mt-6">
          <LeaderboardTable data={yearlyData} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
