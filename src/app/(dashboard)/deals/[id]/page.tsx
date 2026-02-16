import { auth, type ExtendedSession } from "@/lib/auth";
import { getDealById } from "@/lib/actions/deals";
import { getDealPaymentSummary } from "@/lib/actions/payments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Handshake,
  ArrowLeft,
  Phone,
  Mail,
  Globe,
  Calendar,
  User,
  MessageSquare,
  CheckSquare,
  DollarSign,
  CreditCard,
  Percent,
} from "lucide-react";
import Link from "next/link";

const stageColors: Record<string, string> = {
  RESERVATION: "bg-blue-100 text-blue-700",
  DEPOSIT: "bg-indigo-100 text-indigo-700",
  CONTRACT: "bg-purple-100 text-purple-700",
  PAYMENT_PLAN: "bg-pink-100 text-pink-700",
  TITLE_DEED: "bg-orange-100 text-orange-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-red-100 text-red-700",
};

const resultColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  WON: "bg-emerald-100 text-emerald-700",
  LOST: "bg-red-100 text-red-700",
  CANCELLED: "bg-gray-100 text-gray-500",
};

export default async function DealDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) return null;

  const { id } = await params;

  let deal;
  let paymentSummary = { dealValue: 0, totalReceived: 0, totalPending: 0, remaining: 0, paymentCount: 0 };

  try {
    deal = await getDealById(id);
    paymentSummary = await getDealPaymentSummary(id);
  } catch {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500">Deal not found or access denied.</p>
        <Link href="/deals" className="mt-4 text-[#dc2626] hover:underline text-sm">
          Back to deals
        </Link>
      </div>
    );
  }

  const paymentProgress = paymentSummary.dealValue > 0
    ? (paymentSummary.totalReceived / paymentSummary.dealValue) * 100
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/deals">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">{deal.title}</h1>
              <Badge className={stageColors[deal.stage]}>
                {deal.stage.replace(/_/g, " ")}
              </Badge>
              <Badge className={resultColors[deal.result]}>
                {deal.result}
              </Badge>
            </div>
            <p className="text-sm text-gray-500">{deal.dealNumber}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Deal Value & Payment Progress */}
          <Card className="border border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-gray-500">Deal Value</p>
                  <p className="text-3xl font-bold text-gray-900">
                    ${Number(deal.dealValue).toLocaleString()} {deal.currency}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Collected</p>
                  <p className="text-2xl font-bold text-emerald-600">
                    ${paymentSummary.totalReceived.toLocaleString()}
                  </p>
                </div>
              </div>
              <Progress value={paymentProgress} className="h-3" />
              <div className="mt-2 flex justify-between text-xs text-gray-500">
                <span>{paymentProgress.toFixed(1)}% collected</span>
                <span>${paymentSummary.remaining.toLocaleString()} remaining</span>
              </div>
            </CardContent>
          </Card>

          {/* Deal Details */}
          <Card className="border border-gray-200">
            <CardHeader>
              <CardTitle className="text-lg">Deal Details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              {deal.propertyName && (
                <div>
                  <p className="text-xs text-gray-500">Property</p>
                  <p className="text-sm font-medium text-gray-900">{deal.propertyName}</p>
                </div>
              )}
              {deal.unitNumber && (
                <div>
                  <p className="text-xs text-gray-500">Unit</p>
                  <p className="text-sm font-medium text-gray-900">{deal.unitNumber}</p>
                </div>
              )}
              {deal.propertyType && (
                <div>
                  <p className="text-xs text-gray-500">Property Type</p>
                  <p className="text-sm font-medium text-gray-900">{deal.propertyType}</p>
                </div>
              )}
              {deal.probability !== null && (
                <div>
                  <p className="text-xs text-gray-500">Probability</p>
                  <p className="text-sm font-medium text-gray-900">{deal.probability}%</p>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-500">Owner</p>
                <p className="text-sm font-medium text-gray-900">
                  {deal.owner.firstName} {deal.owner.lastName}
                </p>
              </div>
              {deal.expectedCloseDate && (
                <div>
                  <p className="text-xs text-gray-500">Expected Close</p>
                  <p className="text-sm font-medium text-gray-900">
                    {new Date(deal.expectedCloseDate).toLocaleDateString()}
                  </p>
                </div>
              )}
              {deal.fromLead && (
                <div>
                  <p className="text-xs text-gray-500">From Lead</p>
                  <Link href={`/leads/${deal.fromLead.id}`} className="text-sm text-[#dc2626] hover:underline">
                    {deal.fromLead.leadNumber} — {deal.fromLead.title}
                  </Link>
                </div>
              )}
              {deal.description && (
                <div className="sm:col-span-2">
                  <p className="text-xs text-gray-500">Description</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{deal.description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payments */}
          <Card className="border border-gray-200">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payments ({deal.payments.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {deal.payments.length === 0 ? (
                <p className="text-sm text-gray-500">No payments recorded.</p>
              ) : (
                <div className="space-y-2">
                  {deal.payments.map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          ${Number(payment.amount).toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500">
                          {payment.method?.replace(/_/g, " ") || "Pending method"}
                        </p>
                      </div>
                      <Badge className={
                        payment.status === "RECEIVED" ? "bg-emerald-100 text-emerald-700" :
                        payment.status === "PENDING" ? "bg-yellow-100 text-yellow-700" :
                        "bg-gray-100 text-gray-700"
                      }>
                        {payment.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Activity */}
          <Card className="border border-gray-200">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Activity ({deal.activities.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {deal.activities.length === 0 ? (
                <p className="text-sm text-gray-500">No activity yet.</p>
              ) : (
                <div className="space-y-4">
                  {deal.activities.map((activity) => (
                    <div key={activity.id} className="flex gap-3 border-l-2 border-gray-200 pl-4">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                        {activity.description && (
                          <p className="text-sm text-gray-500">{activity.description}</p>
                        )}
                        <p className="mt-1 text-xs text-gray-400">
                          {activity.user.firstName} {activity.user.lastName} &middot;{" "}
                          {new Date(activity.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Client */}
          <Card className="border border-gray-200">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5" />
                Client
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm font-medium text-gray-900">
                {deal.client.firstName} {deal.client.lastName}
              </p>
              {deal.client.email && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="h-4 w-4" />
                  {deal.client.email}
                </div>
              )}
              {deal.client.phone && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="h-4 w-4" />
                  {deal.client.phone}
                </div>
              )}
              <Link href={`/clients/${deal.client.id}`}>
                <Button variant="outline" size="sm" className="w-full mt-2">
                  View Full Profile
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Commissions */}
          <Card className="border border-gray-200">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Percent className="h-5 w-5" />
                Commissions ({deal.commissions.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {deal.commissions.length === 0 ? (
                <p className="text-sm text-gray-500">No commissions.</p>
              ) : (
                <div className="space-y-2">
                  {deal.commissions.map((c) => (
                    <div key={c.id} className="rounded-lg bg-gray-50 p-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">${Number(c.amount).toLocaleString()}</p>
                        <Badge className={
                          c.status === "PAID" ? "bg-emerald-100 text-emerald-700" :
                          c.status === "APPROVED" ? "bg-blue-100 text-blue-700" :
                          "bg-yellow-100 text-yellow-700"
                        }>
                          {c.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500">
                        {c.agent.firstName} {c.agent.lastName}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tasks */}
          <Card className="border border-gray-200">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckSquare className="h-5 w-5" />
                Tasks ({deal.tasks.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {deal.tasks.length === 0 ? (
                <p className="text-sm text-gray-500">No tasks.</p>
              ) : (
                <div className="space-y-2">
                  {deal.tasks.map((task) => (
                    <div key={task.id} className="flex items-center gap-2 rounded-lg bg-gray-50 p-2">
                      <CheckSquare className={`h-4 w-4 ${
                        task.status === "DONE" ? "text-emerald-500" : "text-gray-400"
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dates */}
          <Card className="border border-gray-200">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="h-4 w-4" />
                Created: {new Date(deal.createdAt).toLocaleDateString()}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="h-4 w-4" />
                Updated: {new Date(deal.updatedAt).toLocaleDateString()}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
