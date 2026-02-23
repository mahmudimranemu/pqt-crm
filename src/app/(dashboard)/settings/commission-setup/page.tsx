import { auth, type ExtendedSession } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Percent, DollarSign, Users, TrendingUp } from "lucide-react";

const commissionTiers = [
  {
    id: "standard",
    name: "Standard Agent",
    percentage: 2.0,
    description: "Default commission rate for all sales agents",
    appliesTo: "SALES_AGENT",
    active: true,
  },
  {
    id: "senior",
    name: "Senior Agent",
    percentage: 2.5,
    description: "Higher rate for experienced agents with 2+ years",
    appliesTo: "SALES_AGENT",
    active: true,
  },
  {
    id: "manager",
    name: "Sales Manager Override",
    percentage: 0.5,
    description: "Override commission for sales managers on team deals",
    appliesTo: "SALES_MANAGER",
    active: true,
  },
  {
    id: "referral",
    name: "Referral Bonus",
    percentage: 1.0,
    description: "Commission for referred deals from partner agents",
    appliesTo: "SALES_AGENT",
    active: false,
  },
];

const paymentSchedule = [
  {
    stage: "Reservation",
    percentage: 25,
    description: "Paid when reservation agreement is signed",
  },
  {
    stage: "Deposit",
    percentage: 25,
    description: "Paid when deposit is received from buyer",
  },
  {
    stage: "Contract",
    percentage: 25,
    description: "Paid when sales contract is fully executed",
  },
  {
    stage: "Title Deed",
    percentage: 25,
    description: "Paid when title deed is transferred to buyer",
  },
];

export default async function CommissionSetupPage() {
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
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100">
          <Percent className="h-5 w-5 text-[#dc2626]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Commission Settings
          </h1>
          <p className="text-gray-500">
            Configure commission rates, tiers, and payout schedules
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-100">
                <Percent className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Base Rate</p>
                <p className="text-lg font-bold text-gray-900">2.0%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100">
                <TrendingUp className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Max Rate</p>
                <p className="text-lg font-bold text-gray-900">2.5%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-100">
                <DollarSign className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Manager Override</p>
                <p className="text-lg font-bold text-gray-900">0.5%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100">
                <Users className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Active Tiers</p>
                <p className="text-lg font-bold text-gray-900">
                  {commissionTiers.filter((t) => t.active).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Commission Tiers */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Commission Tiers
        </h2>
        <Card className="border border-gray-200">
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100">
              {commissionTiers.map((tier) => (
                <div
                  key={tier.id}
                  className="flex items-center justify-between px-5 py-4"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                        tier.active
                          ? "bg-[#dc2626] text-white"
                          : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      <Percent className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {tier.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {tier.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-lg font-bold text-gray-900">
                      {tier.percentage}%
                    </span>
                    <Badge
                      className={
                        tier.active
                          ? "bg-green-100 text-green-700 hover:bg-green-100"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-100"
                      }
                    >
                      {tier.active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payout Schedule */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Payout Schedule
        </h2>
        <p className="text-sm text-gray-500">
          Commission is paid in instalments based on deal milestones
        </p>
        <div className="grid gap-4 md:grid-cols-4">
          {paymentSchedule.map((item, index) => (
            <Card key={item.stage} className="border border-gray-200">
              <CardContent className="p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#dc2626] text-xs font-bold text-white">
                    {index + 1}
                  </span>
                  <span className="text-lg font-bold text-[#dc2626]">
                    {item.percentage}%
                  </span>
                </div>
                <p className="text-sm font-medium text-gray-900">
                  {item.stage}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  {item.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-amber-100 bg-amber-50/50 p-4">
        <p className="text-sm text-gray-600">
          <strong>Coming Soon:</strong> Editable commission tiers, custom payout
          schedules per property type, bonus structures, and automatic commission
          calculation based on deal value.
        </p>
      </div>
    </div>
  );
}
