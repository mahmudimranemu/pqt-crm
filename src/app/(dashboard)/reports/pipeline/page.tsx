import { auth, type ExtendedSession } from "@/lib/auth";
import { getPipelineReport } from "@/lib/actions/reports";
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
import { Handshake, ArrowLeft, DollarSign, TrendingUp, BarChart3 } from "lucide-react";
import Link from "next/link";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

const stageColors: Record<string, string> = {
  RESERVATION: "bg-blue-100 text-blue-700",
  DEPOSIT: "bg-purple-100 text-purple-700",
  CONTRACT: "bg-amber-100 text-amber-700",
  PAYMENT_PLAN: "bg-cyan-100 text-cyan-700",
  TITLE_DEED: "bg-emerald-100 text-emerald-700",
  COMPLETED: "bg-green-100 text-green-700",
};

export default async function PipelineReportPage() {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) return null;

  const data = await getPipelineReport();

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
          <Handshake className="h-5 w-5 text-[#dc2626]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pipeline Report</h1>
          <p className="text-gray-500">
            Deal value distribution by stage with progress tracking
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border border-gray-200">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-50 p-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Active Deals</p>
                <p className="text-2xl font-bold text-gray-900">
                  {data.totalDeals}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-gray-200">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-50 p-2">
                <DollarSign className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Pipeline Value</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(data.totalValue)}
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
                <p className="text-sm text-gray-500">Avg Deal Value</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(data.avgDealValue)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stage Breakdown */}
      <Card className="border border-gray-200">
        <CardHeader>
          <CardTitle className="text-lg">Pipeline by Stage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.stages.map((stage) => {
              const widthPercent =
                data.totalValue > 0
                  ? Math.max((stage.value / data.totalValue) * 100, 2)
                  : 0;
              return (
                <div key={stage.stage} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className={stageColors[stage.stage] || "bg-gray-100 text-gray-700"}>
                        {stage.label}
                      </Badge>
                      <span className="text-sm text-gray-500">
                        {stage.count} {stage.count === 1 ? "deal" : "deals"}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">
                      {formatCurrency(stage.value)}
                    </span>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-[#dc2626] transition-all"
                      style={{ width: `${widthPercent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Top Deals Table */}
      <Card className="border border-gray-200">
        <CardHeader>
          <CardTitle className="text-lg">Top Deals by Value</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {data.topDeals.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-gray-500">No active deals found.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-b border-gray-100 bg-gray-50/50">
                  <TableHead className="text-xs font-medium text-gray-500">Deal</TableHead>
                  <TableHead className="text-xs font-medium text-gray-500">Client</TableHead>
                  <TableHead className="text-xs font-medium text-gray-500">Owner</TableHead>
                  <TableHead className="text-xs font-medium text-gray-500">Stage</TableHead>
                  <TableHead className="text-xs font-medium text-gray-500 text-right">Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.topDeals.map((deal) => (
                  <TableRow key={deal.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <TableCell>
                      <Link
                        href={`/deals/${deal.id}`}
                        className="text-sm font-medium text-[#dc2626] hover:underline"
                      >
                        {deal.dealNumber}
                      </Link>
                      <p className="text-xs text-gray-500">{deal.title}</p>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {deal.client.firstName} {deal.client.lastName}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {deal.owner.firstName} {deal.owner.lastName}
                    </TableCell>
                    <TableCell>
                      <Badge className={stageColors[deal.stage] || "bg-gray-100 text-gray-700"}>
                        {deal.stage.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium text-gray-900">
                      {formatCurrency(deal.dealValue)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
