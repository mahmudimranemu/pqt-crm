import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth, type ExtendedSession } from "@/lib/auth";
import {
  getCampaignById,
  updateCampaign,
  deleteCampaign,
} from "@/lib/actions/campaigns";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  Users,
  TrendingUp,
  Zap,
  Clock,
} from "lucide-react";

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  ACTIVE: "bg-emerald-100 text-emerald-700",
  PAUSED: "bg-yellow-100 text-yellow-700",
  COMPLETED: "bg-blue-100 text-blue-700",
  CANCELLED: "bg-red-100 text-red-700",
};

const statusOptions = ["DRAFT", "ACTIVE", "PAUSED", "COMPLETED", "CANCELLED"];

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) return null;

  const isAdmin = ["SUPER_ADMIN", "ADMIN"].includes(session.user.role);

  let campaign;
  try {
    campaign = await getCampaignById(id);
  } catch {
    notFound();
  }

  const budget = campaign.budget ? Number(campaign.budget) : 0;
  const spent = campaign.spent ? Number(campaign.spent) : 0;
  const conversionRate =
    campaign.leadsGenerated > 0
      ? ((campaign.conversions / campaign.leadsGenerated) * 100).toFixed(1)
      : "0.0";
  const roi = spent > 0 ? (((budget - spent) / spent) * 100).toFixed(1) : "N/A";

  async function handleStatusChange(formData: FormData) {
    "use server";
    const newStatus = formData.get("status") as string;
    if (!newStatus) return;
    await updateCampaign(id, { status: newStatus as any });
    redirect(`/campaigns/${id}`);
  }

  async function handleDelete() {
    "use server";
    await deleteCampaign(id);
    redirect("/campaigns");
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/campaigns"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">
                {campaign.name}
              </h1>
              <Badge className={statusColors[campaign.status]}>
                {campaign.status}
              </Badge>
            </div>
            {campaign.description && (
              <p className="mt-1 text-sm text-gray-500">
                {campaign.description}
              </p>
            )}
          </div>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2">
            <form action={handleStatusChange}>
              <div className="flex items-center gap-2">
                <select
                  name="status"
                  defaultValue={campaign.status}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-[#dc2626] focus:outline-none focus:ring-1 focus:ring-[#dc2626]"
                >
                  {statusOptions.map((s) => (
                    <option key={s} value={s}>
                      {s.charAt(0) + s.slice(1).toLowerCase()}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="rounded-lg bg-[#dc2626] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#b91c1c]"
                >
                  Update
                </button>
              </div>
            </form>
            <form action={handleDelete}>
              <button
                type="submit"
                className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
              >
                Delete
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Campaign Info */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border border-gray-200">
          <CardContent className="p-5">
            <h3 className="mb-3 text-sm font-semibold text-gray-900">
              Campaign Details
            </h3>
            <dl className="space-y-2">
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Source</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {campaign.source?.replace(/_/g, " ") || "Not set"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Channel</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {campaign.channel?.replace(/_/g, " ") || "Not set"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Status</dt>
                <dd>
                  <Badge className={statusColors[campaign.status]}>
                    {campaign.status}
                  </Badge>
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Created</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {new Date(campaign.createdAt).toLocaleDateString()}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card className="border border-gray-200">
          <CardContent className="p-5">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
              <Calendar className="h-4 w-4 text-gray-400" />
              Date Range
            </h3>
            <dl className="space-y-2">
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Start Date</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {campaign.startDate
                    ? new Date(campaign.startDate).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })
                    : "Not set"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">End Date</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {campaign.endDate
                    ? new Date(campaign.endDate).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })
                    : "Not set"}
                </dd>
              </div>
              {campaign.startDate && campaign.endDate && (
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Duration</dt>
                  <dd className="text-sm font-medium text-gray-900">
                    {Math.ceil(
                      (new Date(campaign.endDate).getTime() -
                        new Date(campaign.startDate).getTime()) /
                        (1000 * 60 * 60 * 24),
                    )}{" "}
                    days
                  </dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Card className="border border-gray-200">
          <CardContent className="p-5">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-gray-400" />
              <p className="text-xs font-medium text-gray-500">Budget</p>
            </div>
            <p className="mt-2 text-xl font-bold text-gray-900">
              ${budget.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card className="border border-gray-200">
          <CardContent className="p-5">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-red-400" />
              <p className="text-xs font-medium text-gray-500">Spent</p>
            </div>
            <p className="mt-2 text-xl font-bold text-gray-900">
              ${spent.toLocaleString()}
            </p>
            {budget > 0 && (
              <div className="mt-2">
                <div className="h-1.5 w-full rounded-full bg-gray-100">
                  <div
                    className="h-1.5 rounded-full bg-[#dc2626]"
                    style={{
                      width: `${Math.min((spent / budget) * 100, 100)}%`,
                    }}
                  />
                </div>
                <p className="mt-1 text-xs text-gray-400">
                  {((spent / budget) * 100).toFixed(0)}% of budget
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border border-gray-200">
          <CardContent className="p-5">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-400" />
              <p className="text-xs font-medium text-gray-500">Leads</p>
            </div>
            <p className="mt-2 text-xl font-bold text-gray-900">
              {campaign.leadsGenerated}
            </p>
          </CardContent>
        </Card>

        <Card className="border border-gray-200">
          <CardContent className="p-5">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-emerald-400" />
              <p className="text-xs font-medium text-gray-500">Conversions</p>
            </div>
            <p className="mt-2 text-xl font-bold text-emerald-600">
              {campaign.conversions}
            </p>
          </CardContent>
        </Card>

        <Card className="border border-gray-200">
          <CardContent className="p-5">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-400" />
              <p className="text-xs font-medium text-gray-500">Conv. Rate</p>
            </div>
            <p className="mt-2 text-xl font-bold text-gray-900">
              {conversionRate}%
            </p>
          </CardContent>
        </Card>

        <Card className="border border-gray-200">
          <CardContent className="p-5">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-amber-400" />
              <p className="text-xs font-medium text-gray-500">ROI</p>
            </div>
            <p
              className={`mt-2 text-xl font-bold ${
                roi !== "N/A" && parseFloat(roi) >= 0
                  ? "text-emerald-600"
                  : roi !== "N/A"
                    ? "text-red-600"
                    : "text-gray-400"
              }`}
            >
              {roi !== "N/A" ? `${roi}%` : roi}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Campaign Steps Timeline */}
      <Card className="border border-gray-200">
        <CardContent className="p-5">
          <h3 className="mb-4 text-sm font-semibold text-gray-900">
            Campaign Steps
          </h3>

          {campaign.steps.length === 0 ? (
            <div className="py-8 text-center">
              <Zap className="mx-auto mb-3 h-10 w-10 text-gray-300" />
              <p className="text-sm text-gray-500">
                No steps defined for this campaign yet.
              </p>
            </div>
          ) : (
            <div className="relative">
              {/* Vertical timeline line */}
              <div className="absolute left-5 top-0 h-full w-0.5 bg-gray-200" />

              <div className="space-y-6">
                {campaign.steps.map((step, index) => (
                  <div key={step.id} className="relative flex gap-4">
                    {/* Step number circle */}
                    <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-[#dc2626] bg-white text-sm font-bold text-[#dc2626]">
                      {step.stepOrder}
                    </div>

                    {/* Step content */}
                    <div className="flex-1 rounded-lg border border-gray-200 bg-gray-50/50 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900">
                            {step.name}
                          </h4>
                          <div className="mt-1 flex items-center gap-2">
                            <Badge className="bg-blue-100 text-xs text-blue-700">
                              {step.type}
                            </Badge>
                            {step.delayDays > 0 && (
                              <span className="flex items-center gap-1 text-xs text-gray-500">
                                <Clock className="h-3 w-3" />
                                {step.delayDays} day
                                {step.delayDays !== 1 ? "s" : ""} delay
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="text-xs text-gray-400">
                          Step {index + 1} of {campaign.steps.length}
                        </span>
                      </div>

                      {/* Step config */}
                      {step.config &&
                        typeof step.config === "object" &&
                        Object.keys(step.config as Record<string, unknown>)
                          .length > 0 && (
                          <div className="mt-3 rounded-md border border-gray-200 bg-white p-3">
                            <p className="mb-1.5 text-xs font-medium text-gray-500">
                              Configuration
                            </p>
                            <dl className="space-y-1">
                              {Object.entries(
                                step.config as Record<string, unknown>,
                              ).map(([key, value]) => (
                                <div
                                  key={key}
                                  className="flex justify-between text-xs"
                                >
                                  <dt className="text-gray-500">
                                    {key
                                      .replace(/([A-Z])/g, " $1")
                                      .replace(/^./, (s) => s.toUpperCase())}
                                  </dt>
                                  <dd className="font-medium text-gray-700">
                                    {String(value)}
                                  </dd>
                                </div>
                              ))}
                            </dl>
                          </div>
                        )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
