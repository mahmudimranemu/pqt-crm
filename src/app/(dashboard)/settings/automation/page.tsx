import { auth, type ExtendedSession } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Zap,
  Plus,
  Mail,
  CheckSquare,
  Bell,
  UserPlus,
  ArrowRight,
} from "lucide-react";

const automationRules = [
  {
    id: "auto-assign",
    name: "Auto-Assign New Enquiries",
    trigger: "New enquiry created",
    action: "Assign to agent via routing strategy",
    icon: UserPlus,
    enabled: true,
    runs: 342,
  },
  {
    id: "welcome-email",
    name: "Send Welcome Email",
    trigger: "New client registered",
    action: "Send welcome email template",
    icon: Mail,
    enabled: true,
    runs: 289,
  },
  {
    id: "follow-up-task",
    name: "Create Follow-Up Task",
    trigger: "Lead moves to CONTACTED stage",
    action: "Create follow-up task due in 3 days",
    icon: CheckSquare,
    enabled: true,
    runs: 156,
  },
  {
    id: "stale-lead-alert",
    name: "Stale Lead Alert",
    trigger: "Lead inactive for 7 days",
    action: "Notify assigned agent and manager",
    icon: Bell,
    enabled: false,
    runs: 78,
  },
  {
    id: "deal-notification",
    name: "Deal Stage Notification",
    trigger: "Deal moves to new stage",
    action: "Notify manager and update activity log",
    icon: Bell,
    enabled: false,
    runs: 45,
  },
];

export default async function AutomationPage() {
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

  const activeCount = automationRules.filter((r) => r.enabled).length;
  const totalRuns = automationRules.reduce((sum, r) => sum + r.runs, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100">
            <Zap className="h-5 w-5 text-[#dc2626]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Automation</h1>
            <p className="text-gray-500">
              Configure automated workflows and triggers
            </p>
          </div>
        </div>
        <button className="inline-flex items-center gap-2 rounded-lg bg-[#dc2626] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#b91c1c]">
          <Plus className="h-4 w-4" />
          New Rule
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border border-gray-200">
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Total Rules</p>
            <p className="text-2xl font-bold text-gray-900">
              {automationRules.length}
            </p>
          </CardContent>
        </Card>
        <Card className="border border-gray-200">
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Active Rules</p>
            <p className="text-2xl font-bold text-green-600">{activeCount}</p>
          </CardContent>
        </Card>
        <Card className="border border-gray-200">
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Total Runs</p>
            <p className="text-2xl font-bold text-gray-900">
              {totalRuns.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Rules List */}
      <div className="grid gap-4">
        {automationRules.map((rule) => {
          const Icon = rule.icon;
          return (
            <Card
              key={rule.id}
              className={`border transition-colors hover:border-gray-300 ${
                rule.enabled
                  ? "border-gray-200"
                  : "border-gray-200 opacity-60"
              }`}
            >
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                        rule.enabled
                          ? "bg-[#dc2626] text-white"
                          : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">
                        {rule.name}
                      </h3>
                      <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                        <span className="rounded bg-gray-100 px-2 py-0.5">
                          {rule.trigger}
                        </span>
                        <ArrowRight className="h-3 w-3 text-gray-400" />
                        <span className="rounded bg-gray-100 px-2 py-0.5">
                          {rule.action}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-gray-400">
                      {rule.runs} runs
                    </span>
                    <Badge
                      className={
                        rule.enabled
                          ? "bg-green-100 text-green-700 hover:bg-green-100"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-100"
                      }
                    >
                      {rule.enabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="rounded-lg border border-amber-100 bg-amber-50/50 p-4">
        <p className="text-sm text-gray-600">
          <strong>Coming Soon:</strong> Custom rule builder with conditions,
          delays, and multi-step workflows. Connect triggers to email templates,
          task creation, and notifications.
        </p>
      </div>
    </div>
  );
}
