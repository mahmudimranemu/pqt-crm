import { auth, type ExtendedSession } from "@/lib/auth";
import { getAgentPerformance } from "@/lib/actions/kpis";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Users,
  ArrowLeft,
  Trophy,
  DollarSign,
  Target,
  Phone,
  Calendar,
} from "lucide-react";
import Link from "next/link";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default async function AgentsReportPage() {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) return null;

  // Only managers/admins can see this report
  if (
    !["SUPER_ADMIN", "ADMIN", "SALES_MANAGER"].includes(session.user.role)
  ) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link
            href="/reports"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4 text-gray-600" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Agent Performance</h1>
        </div>
        <Card className="border border-gray-200">
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">
              You do not have permission to view this report.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  let monthlyData: any[] = [];
  let quarterlyData: any[] = [];

  try {
    [monthlyData, quarterlyData] = await Promise.all([
      getAgentPerformance("month"),
      getAgentPerformance("quarter"),
    ]);
  } catch {
    // If no data available, show empty state
  }

  const totalRevenue = monthlyData.reduce((sum, a) => sum + a.revenue, 0);
  const totalSales = monthlyData.reduce((sum, a) => sum + a.salesCount, 0);
  const topAgent = monthlyData.length > 0 ? monthlyData[0] : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/reports"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50"
        >
          <ArrowLeft className="h-4 w-4 text-gray-600" />
        </Link>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
          <Users className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agent Performance</h1>
          <p className="text-gray-500">
            Individual agent metrics, rankings, and conversion rates
          </p>
        </div>
      </div>

      {/* Quick links */}
      <div className="flex gap-2">
        <Link
          href="/leaderboards"
          className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-200"
        >
          <Trophy className="h-3.5 w-3.5" /> Leaderboards
        </Link>
        <Link
          href="/kpis/performance"
          className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-200"
        >
          <Target className="h-3.5 w-3.5" /> Detailed Performance
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border border-gray-200">
          <CardContent className="p-5">
            <p className="text-sm text-gray-500">Active Agents</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              {monthlyData.length}
            </p>
          </CardContent>
        </Card>
        <Card className="border border-gray-200">
          <CardContent className="p-5">
            <p className="text-sm text-gray-500">Total Sales (Month)</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              {totalSales}
            </p>
          </CardContent>
        </Card>
        <Card className="border border-gray-200">
          <CardContent className="p-5">
            <p className="text-sm text-gray-500">Total Revenue (Month)</p>
            <p className="mt-1 text-2xl font-bold text-[#dc2626]">
              {formatCurrency(totalRevenue)}
            </p>
          </CardContent>
        </Card>
        <Card className="border border-gray-200">
          <CardContent className="p-5">
            <p className="text-sm text-gray-500">Top Performer</p>
            <p className="mt-1 text-lg font-bold text-gray-900">
              {topAgent?.agentName || "N/A"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Performance Table */}
      <Card className="border border-gray-200">
        <CardHeader>
          <CardTitle className="text-lg">This Month&apos;s Performance</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {monthlyData.length === 0 ? (
            <div className="py-12 text-center">
              <Users className="mx-auto mb-4 h-12 w-12 text-gray-300" />
              <p className="text-gray-500">No agent data available.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-b border-gray-100 bg-gray-50/50">
                  <TableHead className="text-xs font-medium text-gray-500 w-10">#</TableHead>
                  <TableHead className="text-xs font-medium text-gray-500">Agent</TableHead>
                  <TableHead className="text-xs font-medium text-gray-500">Office</TableHead>
                  <TableHead className="text-xs font-medium text-gray-500 text-right">Sales</TableHead>
                  <TableHead className="text-xs font-medium text-gray-500 text-right">Revenue</TableHead>
                  <TableHead className="text-xs font-medium text-gray-500 text-right">Commission</TableHead>
                  <TableHead className="text-xs font-medium text-gray-500 text-right">Bookings</TableHead>
                  <TableHead className="text-xs font-medium text-gray-500 text-right">Calls</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monthlyData.map((agent, index) => (
                  <TableRow
                    key={agent.agentId}
                    className={`border-b border-gray-50 hover:bg-gray-50/50 ${
                      index < 3 ? "bg-yellow-50/30" : ""
                    }`}
                  >
                    <TableCell className="text-sm font-medium text-gray-500">
                      {index + 1}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">
                          {agent.agentName}
                        </span>
                        {index === 0 && (
                          <Trophy className="h-4 w-4 text-yellow-500" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {agent.office}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium text-gray-900">
                      {agent.salesCount}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium text-gray-900">
                      {formatCurrency(agent.revenue)}
                    </TableCell>
                    <TableCell className="text-right text-sm text-[#dc2626]">
                      {formatCurrency(agent.commission)}
                    </TableCell>
                    <TableCell className="text-right text-sm text-gray-600">
                      {agent.bookings}
                    </TableCell>
                    <TableCell className="text-right text-sm text-gray-600">
                      {agent.calls}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Quarterly Performance Table */}
      {quarterlyData.length > 0 && (
        <Card className="border border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg">Quarterly Performance</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-gray-100 bg-gray-50/50">
                  <TableHead className="text-xs font-medium text-gray-500 w-10">#</TableHead>
                  <TableHead className="text-xs font-medium text-gray-500">Agent</TableHead>
                  <TableHead className="text-xs font-medium text-gray-500">Office</TableHead>
                  <TableHead className="text-xs font-medium text-gray-500 text-right">Sales</TableHead>
                  <TableHead className="text-xs font-medium text-gray-500 text-right">Revenue</TableHead>
                  <TableHead className="text-xs font-medium text-gray-500 text-right">Commission</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quarterlyData.map((agent, index) => (
                  <TableRow
                    key={agent.agentId}
                    className="border-b border-gray-50 hover:bg-gray-50/50"
                  >
                    <TableCell className="text-sm font-medium text-gray-500">
                      {index + 1}
                    </TableCell>
                    <TableCell className="text-sm font-medium text-gray-900">
                      {agent.agentName}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {agent.office}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium text-gray-900">
                      {agent.salesCount}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium text-gray-900">
                      {formatCurrency(agent.revenue)}
                    </TableCell>
                    <TableCell className="text-right text-sm text-[#dc2626]">
                      {formatCurrency(agent.commission)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
