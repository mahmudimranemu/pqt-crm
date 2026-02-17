import { auth, type ExtendedSession } from "@/lib/auth";
import { getDealsByStage, getDealStats } from "@/lib/actions/deals";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Handshake, Plus, DollarSign, TrendingUp, Trophy } from "lucide-react";
import Link from "next/link";
import { DealKanban } from "./deal-kanban";

export default async function DealsPage() {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) return null;

  const [stageData, stats] = await Promise.all([
    getDealsByStage(),
    getDealStats(),
  ]);

  const statCards = [
    {
      title: "Total Deals",
      value: stats.total,
      icon: Handshake,
      color: "text-[#dc2626]",
      bg: "bg-blue-50",
    },
    {
      title: "Pipeline Value",
      value: `$${Number(stats.pipelineValue).toLocaleString()}`,
      icon: DollarSign,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      title: "Won Deals",
      value: stats.wonCount,
      icon: Trophy,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      title: "Won Value",
      value: `$${Number(stats.wonValue).toLocaleString()}`,
      icon: TrendingUp,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
            <Handshake className="h-5 w-5 text-[#dc2626]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Deal Pipeline</h1>
            <p className="text-gray-500">
              Track deals from reservation to completion
            </p>
          </div>
        </div>
        {session.user.role !== "VIEWER" && (
          <Link href="/deals/create">
            <Button className="gap-2 bg-[#dc2626] hover:bg-[#b91c1c] text-white">
              <Plus className="h-4 w-4" />
              New Deal
            </Button>
          </Link>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title} className="border border-gray-200">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{stat.title}</p>
                  <p className="mt-1 text-2xl font-bold text-gray-900">
                    {stat.value}
                  </p>
                </div>
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.bg}`}
                >
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Kanban Board */}
      <DealKanban initialData={stageData} userRole={session.user.role} />
    </div>
  );
}
