import { auth, type ExtendedSession } from "@/lib/auth";
import { getLostDealsAnalysis } from "@/lib/actions/reports";
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
import { Target, ArrowLeft, XCircle, DollarSign, TrendingDown, AlertTriangle } from "lucide-react";
import Link from "next/link";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default async function LostDealsReportPage() {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) return null;

  const data = await getLostDealsAnalysis();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/reports"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50"
        >
          <ArrowLeft className="h-4 w-4 text-gray-600" />
        </Link>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50">
          <Target className="h-5 w-5 text-red-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Lost Deals Analysis
          </h1>
          <p className="text-gray-500">
            Understanding why deals are lost and top reasons
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border border-gray-200">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-red-50 p-2">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Lost Deals</p>
                <p className="text-2xl font-bold text-red-600">
                  {data.lostDealCount}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-gray-200">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-orange-50 p-2">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Lost Leads</p>
                <p className="text-2xl font-bold text-orange-600">
                  {data.lostLeadCount}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-gray-200">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-gray-100 p-2">
                <DollarSign className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Lost Value</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(data.totalLostValue)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-gray-200">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-purple-50 p-2">
                <TrendingDown className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Deal Loss Rate</p>
                <p className="text-2xl font-bold text-gray-900">
                  {data.dealLossRate}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Lost Reasons */}
      <Card className="border border-gray-200">
        <CardHeader>
          <CardTitle className="text-lg">Top Reasons for Loss</CardTitle>
        </CardHeader>
        <CardContent>
          {data.topReasons.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-gray-500">No lost reason data available yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.topReasons.map((reason, index) => {
                const maxCount = data.topReasons[0].count;
                const widthPercent = Math.max(
                  (reason.count / maxCount) * 100,
                  5,
                );
                return (
                  <div key={index} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">
                        {reason.reason}
                      </span>
                      <span className="text-sm font-semibold text-gray-900">
                        {reason.count}
                      </span>
                    </div>
                    <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-red-500 transition-all"
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

      {/* Lost Deals Table */}
      {data.lostDeals.length > 0 && (
        <Card className="border border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg">
              Lost Deals ({data.lostDealCount})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-gray-100 bg-gray-50/50">
                  <TableHead className="text-xs font-medium text-gray-500">Deal</TableHead>
                  <TableHead className="text-xs font-medium text-gray-500">Client</TableHead>
                  <TableHead className="text-xs font-medium text-gray-500">Owner</TableHead>
                  <TableHead className="text-xs font-medium text-gray-500">Reason</TableHead>
                  <TableHead className="text-xs font-medium text-gray-500 text-right">Value</TableHead>
                  <TableHead className="text-xs font-medium text-gray-500">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.lostDeals.map((deal) => (
                  <TableRow
                    key={deal.id}
                    className="border-b border-gray-50 hover:bg-gray-50/50"
                  >
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
                      <span className="text-sm text-gray-600">
                        {deal.lostReason || "Not specified"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium text-gray-900">
                      {formatCurrency(deal.dealValue)}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {deal.actualCloseDate
                        ? new Date(deal.actualCloseDate).toLocaleDateString()
                        : "--"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Lost Leads Table */}
      {data.lostLeads.length > 0 && (
        <Card className="border border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg">
              Lost Leads ({data.lostLeadCount})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-gray-100 bg-gray-50/50">
                  <TableHead className="text-xs font-medium text-gray-500">Lead</TableHead>
                  <TableHead className="text-xs font-medium text-gray-500">Client</TableHead>
                  <TableHead className="text-xs font-medium text-gray-500">Owner</TableHead>
                  <TableHead className="text-xs font-medium text-gray-500">Reason</TableHead>
                  <TableHead className="text-xs font-medium text-gray-500 text-right">Est. Value</TableHead>
                  <TableHead className="text-xs font-medium text-gray-500">Last Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.lostLeads.map((lead) => (
                  <TableRow
                    key={lead.id}
                    className="border-b border-gray-50 hover:bg-gray-50/50"
                  >
                    <TableCell>
                      <Link
                        href={`/leads/${lead.id}`}
                        className="text-sm font-medium text-[#dc2626] hover:underline"
                      >
                        {lead.leadNumber}
                      </Link>
                      <p className="text-xs text-gray-500">{lead.title}</p>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {lead.client.firstName} {lead.client.lastName}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {lead.owner.firstName} {lead.owner.lastName}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-600">
                        {lead.lostReason || "Not specified"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium text-gray-900">
                      {lead.estimatedValue > 0
                        ? formatCurrency(lead.estimatedValue)
                        : "--"}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {new Date(lead.updatedAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Empty state when no lost data */}
      {data.lostDealCount === 0 && data.lostLeadCount === 0 && (
        <Card className="border border-gray-200">
          <CardContent className="py-12 text-center">
            <Target className="mx-auto mb-4 h-12 w-12 text-gray-300" />
            <p className="text-lg font-medium text-gray-700">No lost deals or leads</p>
            <p className="mt-1 text-sm text-gray-500">
              When deals or leads are marked as lost, their analysis will appear here.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
