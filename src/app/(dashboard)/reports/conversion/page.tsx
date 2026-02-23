import { auth, type ExtendedSession } from "@/lib/auth";
import { getConversionFunnel } from "@/lib/actions/reports";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, ArrowLeft, TrendingUp, Users, CheckCircle, XCircle } from "lucide-react";
import Link from "next/link";

export default async function ConversionReportPage() {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) return null;

  const data = await getConversionFunnel();

  const maxCount = Math.max(...data.funnel.map((f) => f.count), 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/reports"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50"
        >
          <ArrowLeft className="h-4 w-4 text-gray-600" />
        </Link>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50">
          <Target className="h-5 w-5 text-purple-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Conversion Funnel</h1>
          <p className="text-gray-500">
            Enquiry to close conversion rates and funnel analysis
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border border-gray-200">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-50 p-2">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Leads</p>
                <p className="text-2xl font-bold text-gray-900">
                  {data.totalLeads}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-gray-200">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-50 p-2">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Won (Deals)</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {data.wonDeals}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-gray-200">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-red-50 p-2">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Lost Leads</p>
                <p className="text-2xl font-bold text-red-600">
                  {data.lostLeads}
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
                <p className="text-sm text-gray-500">Conversion Rate</p>
                <p className="text-2xl font-bold text-purple-600">
                  {data.conversionRate}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Funnel Visualization */}
      <Card className="border border-gray-200">
        <CardHeader>
          <CardTitle className="text-lg">Lead Stage Funnel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.funnel.map((stage, index) => {
              const widthPercent = Math.max(
                (stage.count / maxCount) * 100,
                stage.count > 0 ? 5 : 0,
              );

              const colors = [
                "bg-blue-500",
                "bg-blue-400",
                "bg-indigo-500",
                "bg-purple-500",
                "bg-purple-400",
                "bg-amber-500",
                "bg-orange-500",
                "bg-emerald-500",
                "bg-red-500",
              ];

              return (
                <div key={stage.stage} className="flex items-center gap-4">
                  <div className="w-40 shrink-0 text-right">
                    <span className="text-sm font-medium text-gray-700">
                      {stage.label}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="h-8 flex-1 overflow-hidden rounded bg-gray-100">
                        <div
                          className={`h-full rounded ${colors[index] || "bg-gray-400"} transition-all flex items-center justify-end pr-2`}
                          style={{ width: `${widthPercent}%` }}
                        >
                          {stage.count > 0 && widthPercent > 15 && (
                            <span className="text-xs font-medium text-white">
                              {stage.count}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="w-20 shrink-0 text-right">
                        <span className="text-sm font-semibold text-gray-900">
                          {stage.count}
                        </span>
                        <span className="ml-1 text-xs text-gray-500">
                          ({stage.percentage}%)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Conversion Rates */}
      <Card className="border border-gray-200">
        <CardHeader>
          <CardTitle className="text-lg">Key Conversion Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-lg border border-gray-100 p-4">
              <p className="text-sm text-gray-500">Lead to Deal Conversion</p>
              <p className="mt-1 text-3xl font-bold text-gray-900">
                {data.leadToDealRate}%
              </p>
              <p className="mt-1 text-xs text-gray-500">
                {data.totalDeals} deals from {data.totalLeads} leads
              </p>
            </div>
            <div className="rounded-lg border border-gray-100 p-4">
              <p className="text-sm text-gray-500">Overall Win Rate</p>
              <p className="mt-1 text-3xl font-bold text-emerald-600">
                {data.conversionRate}%
              </p>
              <p className="mt-1 text-xs text-gray-500">
                {data.wonDeals} won deals from {data.totalLeads} leads
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
