import { auth, type ExtendedSession } from "@/lib/auth";
import { getSourceAnalysis } from "@/lib/actions/reports";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, ArrowLeft, Users, Target } from "lucide-react";
import Link from "next/link";

const sourceColors: Record<string, string> = {
  WEBSITE: "bg-blue-100 text-blue-700",
  REFERRAL: "bg-green-100 text-green-700",
  SOCIAL_MEDIA: "bg-purple-100 text-purple-700",
  GOOGLE_ADS: "bg-red-100 text-red-700",
  FACEBOOK_ADS: "bg-indigo-100 text-indigo-700",
  WALK_IN: "bg-amber-100 text-amber-700",
  PARTNER: "bg-cyan-100 text-cyan-700",
  OTHER: "bg-gray-100 text-gray-700",
};

const channelColors: Record<string, string> = {
  ORGANIC: "bg-green-100 text-green-700",
  PAID_SEARCH: "bg-red-100 text-red-700",
  SOCIAL_MEDIA: "bg-purple-100 text-purple-700",
  REFERRAL: "bg-blue-100 text-blue-700",
  DIRECT: "bg-amber-100 text-amber-700",
  EMAIL_CAMPAIGN: "bg-cyan-100 text-cyan-700",
  PARTNER: "bg-indigo-100 text-indigo-700",
  EVENT: "bg-pink-100 text-pink-700",
};

export default async function SourcesReportPage() {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) return null;

  const data = await getSourceAnalysis();

  const maxSourceCount = Math.max(...data.sources.map((s) => s.count), 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/reports"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50"
        >
          <ArrowLeft className="h-4 w-4 text-gray-600" />
        </Link>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
          <TrendingUp className="h-5 w-5 text-amber-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Source Analysis</h1>
          <p className="text-gray-500">
            Lead source effectiveness and conversion tracking
          </p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border border-gray-200">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-50 p-2">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Leads</p>
                <p className="text-2xl font-bold text-gray-900">{data.totalLeads}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-gray-200">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-amber-50 p-2">
                <TrendingUp className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Active Sources</p>
                <p className="text-2xl font-bold text-gray-900">{data.sources.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-gray-200">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-50 p-2">
                <Target className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Active Channels</p>
                <p className="text-2xl font-bold text-gray-900">{data.channels.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lead Sources */}
      <Card className="border border-gray-200">
        <CardHeader>
          <CardTitle className="text-lg">Lead Sources</CardTitle>
        </CardHeader>
        <CardContent>
          {data.sources.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-gray-500">No source data available. Sources are tracked when leads are created with a source field.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {data.sources.map((source) => {
                const widthPercent = Math.max(
                  (source.count / maxSourceCount) * 100,
                  5,
                );
                return (
                  <div key={source.source} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge
                          className={
                            sourceColors[source.source] ||
                            "bg-gray-100 text-gray-700"
                          }
                        >
                          {source.label}
                        </Badge>
                        <span className="text-sm text-gray-500">
                          {source.count} leads
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-500">
                          {source.conversions} converted
                        </span>
                        <Badge
                          variant="outline"
                          className={
                            source.conversionRate > 20
                              ? "border-emerald-200 text-emerald-700"
                              : source.conversionRate > 10
                                ? "border-amber-200 text-amber-700"
                                : "border-gray-200 text-gray-500"
                          }
                        >
                          {source.conversionRate}% conv.
                        </Badge>
                      </div>
                    </div>
                    <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-amber-500 transition-all"
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

      {/* Source Channels */}
      <Card className="border border-gray-200">
        <CardHeader>
          <CardTitle className="text-lg">Source Channels</CardTitle>
        </CardHeader>
        <CardContent>
          {data.channels.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-gray-500">No channel data available.</p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {data.channels.map((channel) => (
                <div
                  key={channel.channel}
                  className="flex items-center justify-between rounded-lg border border-gray-100 p-4"
                >
                  <div className="flex items-center gap-2">
                    <Badge
                      className={
                        channelColors[channel.channel] ||
                        "bg-gray-100 text-gray-700"
                      }
                    >
                      {channel.label}
                    </Badge>
                  </div>
                  <span className="text-lg font-semibold text-gray-900">
                    {channel.count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
