import { auth, type ExtendedSession } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Settings, RotateCcw, Globe, BarChart3 } from "lucide-react";

const strategies = [
  {
    id: "round-robin",
    title: "Round Robin",
    description:
      "Distributes enquiries evenly across all active agents in rotation. Each new enquiry is assigned to the next agent in the queue, ensuring fair and balanced workload distribution.",
    icon: RotateCcw,
    active: false,
  },
  {
    id: "territory-based",
    title: "Territory-Based",
    description:
      "Assigns enquiries based on client country matching agent office location. Agents receive leads from territories aligned with their regional expertise and office assignment.",
    icon: Globe,
    active: false,
  },
  {
    id: "capacity-based",
    title: "Capacity-Based",
    description:
      "Assigns new enquiries to the agent with the fewest open leads and active enquiries. This ensures workload stays balanced by prioritising agents with the most available capacity.",
    icon: BarChart3,
    active: true,
  },
];

export default async function RoutingSettingsPage() {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) return null;

  if (!["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500">
          You don&apos;t have permission to view this page.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
          <Settings className="h-5 w-5 text-[#dc2626]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lead Routing</h1>
          <p className="text-gray-500">
            Configure how new enquiries are assigned to agents
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {strategies.map((strategy) => {
          const Icon = strategy.icon;
          return (
            <Card
              key={strategy.id}
              className={`relative border ${
                strategy.active
                  ? "border-[#dc2626] ring-1 ring-[#dc2626]/20"
                  : "border-gray-200"
              }`}
            >
              <CardContent className="p-6">
                <div className="mb-4 flex items-start justify-between">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                      strategy.active
                        ? "bg-[#dc2626] text-white"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <Badge
                    className={
                      strategy.active
                        ? "bg-green-100 text-green-700 hover:bg-green-100"
                        : "bg-gray-100 text-gray-500 hover:bg-gray-100"
                    }
                  >
                    {strategy.active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <h3 className="mb-1 text-sm font-semibold text-gray-900">
                  {strategy.title}
                </h3>
                <p className="text-sm leading-relaxed text-gray-500">
                  {strategy.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-4">
        <p className="text-sm text-gray-600">
          Routing is automatically applied when new enquiries are created. The
          active strategy determines how agents are assigned.
        </p>
      </div>
    </div>
  );
}
