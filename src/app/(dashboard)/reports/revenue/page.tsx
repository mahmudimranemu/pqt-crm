import { auth, type ExtendedSession } from "@/lib/auth";
import { getRevenueReport } from "@/lib/actions/reports";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DollarSign, ArrowLeft, TrendingUp, BarChart3, Target } from "lucide-react";
import Link from "next/link";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default async function RevenueReportPage() {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) return null;

  const data = await getRevenueReport();

  const maxRevenue = Math.max(...data.monthlyData.map((m) => m.revenue), 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/reports"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50"
        >
          <ArrowLeft className="h-4 w-4 text-gray-600" />
        </Link>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
          <DollarSign className="h-5 w-5 text-emerald-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Revenue Reports</h1>
          <p className="text-gray-500">
            Monthly revenue trends, totals, and deal counts
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border border-gray-200">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-50 p-2">
                <DollarSign className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Won Revenue</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {formatCurrency(data.totalWonRevenue)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-gray-200">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-50 p-2">
                <Target className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Won Deals</p>
                <p className="text-2xl font-bold text-gray-900">
                  {data.totalWonDeals}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-gray-200">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-amber-50 p-2">
                <BarChart3 className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Pipeline Value</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(data.pipelineValue)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-gray-200">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-purple-50 p-2">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Avg Deal Size</p>
                <p className="text-2xl font-bold text-gray-900">
                  {data.totalWonDeals > 0
                    ? formatCurrency(data.totalWonRevenue / data.totalWonDeals)
                    : "$0"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Revenue Chart (bar chart using divs) */}
      <Card className="border border-gray-200">
        <CardHeader>
          <CardTitle className="text-lg">Monthly Revenue (Last 12 Months)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-2" style={{ height: "250px" }}>
            {data.monthlyData.map((month) => {
              const heightPercent =
                maxRevenue > 0
                  ? Math.max((month.revenue / maxRevenue) * 100, month.revenue > 0 ? 3 : 0)
                  : 0;
              return (
                <div
                  key={month.month}
                  className="flex flex-1 flex-col items-center gap-1"
                >
                  <span className="text-xs font-medium text-gray-700">
                    {month.revenue > 0
                      ? `$${(month.revenue / 1000).toFixed(0)}k`
                      : ""}
                  </span>
                  <div
                    className="w-full rounded-t bg-[#dc2626] transition-all hover:bg-[#b91c1c]"
                    style={{ height: `${heightPercent}%`, minHeight: month.revenue > 0 ? "4px" : "0px" }}
                    title={`${month.month}: ${formatCurrency(month.revenue)} (${month.deals} deals)`}
                  />
                  <span className="text-xs text-gray-500">
                    {month.month.split(" ")[0]}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Monthly Breakdown Table */}
      <Card className="border border-gray-200">
        <CardHeader>
          <CardTitle className="text-lg">Monthly Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-gray-100 bg-gray-50/50">
                <TableHead className="text-xs font-medium text-gray-500">Month</TableHead>
                <TableHead className="text-xs font-medium text-gray-500 text-right">Deals Closed</TableHead>
                <TableHead className="text-xs font-medium text-gray-500 text-right">Revenue</TableHead>
                <TableHead className="text-xs font-medium text-gray-500 text-right">Avg Deal Size</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.monthlyData
                .slice()
                .reverse()
                .map((month) => (
                  <TableRow key={month.month} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <TableCell className="text-sm font-medium text-gray-900">
                      {month.month}
                    </TableCell>
                    <TableCell className="text-right text-sm text-gray-600">
                      {month.deals}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium text-gray-900">
                      {formatCurrency(month.revenue)}
                    </TableCell>
                    <TableCell className="text-right text-sm text-gray-600">
                      {month.deals > 0
                        ? formatCurrency(month.revenue / month.deals)
                        : "--"}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
