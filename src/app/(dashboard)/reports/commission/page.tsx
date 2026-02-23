import { auth, type ExtendedSession } from "@/lib/auth";
import { getCommissionBreakdown } from "@/lib/actions/reports";
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
import { BarChart3, ArrowLeft, DollarSign, Clock, CheckCircle, Banknote } from "lucide-react";
import Link from "next/link";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  APPROVED: "bg-blue-100 text-blue-700",
  PAID: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-gray-100 text-gray-500",
};

const statusIcons: Record<string, typeof Clock> = {
  PENDING: Clock,
  APPROVED: CheckCircle,
  PAID: Banknote,
};

export default async function CommissionReportPage() {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) return null;

  const data = await getCommissionBreakdown();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/reports"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50"
        >
          <ArrowLeft className="h-4 w-4 text-gray-600" />
        </Link>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-pink-50">
          <BarChart3 className="h-5 w-5 text-pink-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Commission Breakdown
          </h1>
          <p className="text-gray-500">
            Commission status, amounts, and agent payouts
          </p>
        </div>
      </div>

      {/* Quick link */}
      <div className="flex gap-2">
        <Link
          href="/commissions"
          className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-200"
        >
          <DollarSign className="h-3.5 w-3.5" /> View All Commissions
        </Link>
      </div>

      {/* Status Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        {data.statusBreakdown.map((status) => {
          const IconComponent = statusIcons[status.status] || Clock;
          return (
            <Card key={status.status} className="border border-gray-200">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-gray-50 p-2">
                    <IconComponent className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">{status.status}</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(status.amount)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {status.count} commissions
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        <Card className="border border-gray-200">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-[#dc2626]/10 p-2">
                <DollarSign className="h-5 w-5 text-[#dc2626]" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Grand Total</p>
                <p className="text-2xl font-bold text-[#dc2626]">
                  {formatCurrency(data.totalAmount)}
                </p>
                <p className="text-xs text-gray-500">
                  {data.totalCommissions} total
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Agent Breakdown */}
      <Card className="border border-gray-200">
        <CardHeader>
          <CardTitle className="text-lg">Commission by Agent</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {data.agentBreakdown.length === 0 ? (
            <div className="py-12 text-center">
              <BarChart3 className="mx-auto mb-4 h-12 w-12 text-gray-300" />
              <p className="text-gray-500">No commission data available.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-b border-gray-100 bg-gray-50/50">
                  <TableHead className="text-xs font-medium text-gray-500 w-10">#</TableHead>
                  <TableHead className="text-xs font-medium text-gray-500">Agent</TableHead>
                  <TableHead className="text-xs font-medium text-gray-500 text-right">Commissions</TableHead>
                  <TableHead className="text-xs font-medium text-gray-500 text-right">Total Amount</TableHead>
                  <TableHead className="text-xs font-medium text-gray-500 text-right">Avg per Deal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.agentBreakdown.map((agent, index) => (
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
                    <TableCell className="text-right text-sm text-gray-600">
                      {agent.count}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium text-[#dc2626]">
                      {formatCurrency(agent.totalAmount)}
                    </TableCell>
                    <TableCell className="text-right text-sm text-gray-600">
                      {agent.count > 0
                        ? formatCurrency(agent.totalAmount / agent.count)
                        : "--"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Status Distribution */}
      <Card className="border border-gray-200">
        <CardHeader>
          <CardTitle className="text-lg">Status Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          {data.statusBreakdown.length === 0 ? (
            <p className="text-gray-500">No data available.</p>
          ) : (
            <div className="space-y-3">
              {data.statusBreakdown.map((status) => {
                const widthPercent =
                  data.totalAmount > 0
                    ? Math.max((status.amount / data.totalAmount) * 100, 3)
                    : 0;
                return (
                  <div key={status.status} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Badge className={statusColors[status.status] || "bg-gray-100 text-gray-700"}>
                        {status.status}
                      </Badge>
                      <span className="text-sm font-medium text-gray-900">
                        {formatCurrency(status.amount)} ({status.count})
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-pink-500 transition-all"
                        style={{ width: `${widthPercent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
