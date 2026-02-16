import { auth, type ExtendedSession } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  TrendingUp,
  Target,
  Handshake,
  DollarSign,
  Users,
  BarChart3,
} from "lucide-react";
import Link from "next/link";

const reportCards = [
  {
    title: "Pipeline Report",
    description: "Deal value distribution by stage with progress tracking",
    icon: Handshake,
    color: "text-[#dc2626]",
    bg: "bg-blue-50",
    href: "/reports/pipeline",
  },
  {
    title: "Conversion Funnel",
    description: "Enquiry to close conversion rates and funnel analysis",
    icon: Target,
    color: "text-purple-600",
    bg: "bg-purple-50",
    href: "/reports/conversion",
  },
  {
    title: "Agent Performance",
    description: "Individual agent metrics, rankings, and conversion rates",
    icon: Users,
    color: "text-blue-600",
    bg: "bg-blue-50",
    href: "/reports/agents",
  },
  {
    title: "Revenue Reports",
    description: "Monthly revenue trends, totals, and deal counts",
    icon: DollarSign,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    href: "/reports/revenue",
  },
  {
    title: "Source Analysis",
    description: "Lead source effectiveness and conversion tracking",
    icon: TrendingUp,
    color: "text-amber-600",
    bg: "bg-amber-50",
    href: "/reports/sources",
  },
  {
    title: "Commission Breakdown",
    description: "Commission status, amounts, and agent payouts",
    icon: BarChart3,
    color: "text-pink-600",
    bg: "bg-pink-50",
    href: "/reports/commission",
  },
  {
    title: "Lost Deals Analysis",
    description: "Understanding why deals are lost and top reasons",
    icon: Target,
    color: "text-red-600",
    bg: "bg-red-50",
    href: "/reports/lost-deals",
  },
];

export default async function ReportsPage() {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-100">
          <TrendingUp className="h-5 w-5 text-teal-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-500">
            Analytics and insights across your CRM
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {reportCards.map((report) => (
          <Link key={report.title} href={report.href}>
            <Card className="border border-gray-200 transition-all hover:shadow-lg hover:border-gray-300 cursor-pointer h-full">
              <CardContent className="p-6">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-xl ${report.bg} mb-4`}
                >
                  <report.icon className={`h-6 w-6 ${report.color}`} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {report.title}
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  {report.description}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
